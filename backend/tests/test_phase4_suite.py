import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from starlette.testclient import TestClient
from pymongo import MongoClient
from app.main import app

def cleanup_test_records():
    client = MongoClient("mongodb://localhost:27017")
    db = client["master_scheduler"]
    test_filter = {"$regex": "test|msc|p4|p5", "$options": "i"}
    
    # Phase 4 collections
    db["faculty_availability"].delete_many({})
    db["fixed_timetable_slots"].delete_many({})
    db["scheduling_settings"].delete_many({})
    db["class_constraints"].delete_many({})
    db["faculty_constraints"].delete_many({})
    db["subject_constraints"].delete_many({})

    # Baseline collections
    db["faculty_allocations"].delete_many({})
    db["classes"].delete_many({"name": test_filter})
    db["subjects"].delete_many({"$or": [{"name": test_filter}, {"subjectCode": test_filter}]})
    db["semesters"].delete_many({"$or": [{"name": test_filter}, {"displayName": test_filter}]})
    db["programmes"].delete_many({"code": test_filter})
    db["faculty"].delete_many({"facultyCode": test_filter})
    db["resources"].delete_many({"code": test_filter})
    db["time_slots"].delete_many({"name": test_filter})
    db["working_days"].delete_many({"name": test_filter})
    db["semester_types"].delete_many({"code": test_filter})
    db["academic_years"].delete_many({"name": test_filter})
    client.close()

def test_full_phase4_suite():
    cleanup_test_records()
    with TestClient(app) as client:
        # ----------------------------------------------------
        # 1. SETUP BASELINE DATA (AY, SemesterType, Working Days, Time Slots, Programme, Class, Faculty, Subject, Resource)
        # ----------------------------------------------------
        ay_res = client.post("/api/academic-years", json={
            "name": "2026-2027 P4 Test",
            "startYear": 2026,
            "endYear": 2027,
            "isCurrent": True
        })
        assert ay_res.status_code == 201
        ay_id = ay_res.json()["data"]["id"]

        st_res = client.post("/api/semester-types", json={
            "name": "Odd Semester P4",
            "code": "ODD_P4",
            "description": "Odd term for test"
        })
        assert st_res.status_code == 201
        st_id = st_res.json()["data"]["id"]

        # 2 Working Days: Monday & Tuesday
        day1_res = client.post("/api/working-days", json={
            "name": "Monday P4",
            "shortName": "MON_P4",
            "dayOrder": 1,
            "isWorkingDay": True
        })
        assert day1_res.status_code == 201
        day1_id = day1_res.json()["data"]["id"]

        day2_res = client.post("/api/working-days", json={
            "name": "Tuesday P4",
            "shortName": "TUE_P4",
            "dayOrder": 2,
            "isWorkingDay": True
        })
        assert day2_res.status_code == 201
        day2_id = day2_res.json()["data"]["id"]

        # 3 Time Slots: P1 (Teaching), P2 (Teaching), Lunch (Non-Teaching)
        slot1_res = client.post("/api/time-slots", json={
            "name": "Period 1 P4",
            "startTime": "09:00",
            "endTime": "10:00",
            "isTeachingSlot": True,
            "slotOrder": 1
        })
        assert slot1_res.status_code == 201
        slot1_id = slot1_res.json()["data"]["id"]

        slot2_res = client.post("/api/time-slots", json={
            "name": "Period 2 P4",
            "startTime": "10:00",
            "endTime": "11:00",
            "isTeachingSlot": True,
            "slotOrder": 2
        })
        assert slot2_res.status_code == 201
        slot2_id = slot2_res.json()["data"]["id"]

        slot_lunch_res = client.post("/api/time-slots", json={
            "name": "Lunch Break P4",
            "startTime": "12:00",
            "endTime": "13:00",
            "isTeachingSlot": False,
            "slotOrder": 3
        })
        assert slot_lunch_res.status_code == 201
        slot_lunch_id = slot_lunch_res.json()["data"]["id"]

        # Programme, Semester, Class
        prog_res = client.post("/api/programmes", json={
            "name": "Master of Computer Applications P4",
            "code": "MCA_P4",
            "shortName": "MCA-P4",
            "totalSemesters": 4
        })
        assert prog_res.status_code == 201
        prog_id = prog_res.json()["data"]["id"]

        sem_res = client.post("/api/semesters", json={
            "name": "Semester 1 P4",
            "displayName": "MCA Sem 1 P4",
            "semesterNumber": 1,
            "programmeId": prog_id
        })
        assert sem_res.status_code == 201
        sem_id = sem_res.json()["data"]["id"]

        cls_res = client.post("/api/classes", json={
            "name": "MCA-I Section A P4",
            "displayName": "MCA-I Sec A P4",
            "programmeId": prog_id,
            "semesterId": sem_id,
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "section": "A",
            "studentStrength": 60
        })
        assert cls_res.status_code == 201
        cls_id = cls_res.json()["data"]["id"]

        # Second Class for multi-class fixed slot testing
        cls2_res = client.post("/api/classes", json={
            "name": "MCA-I Section B P4",
            "displayName": "MCA-I Sec B P4",
            "programmeId": prog_id,
            "semesterId": sem_id,
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "section": "B",
            "studentStrength": 60
        })
        assert cls2_res.status_code == 201
        cls2_id = cls2_res.json()["data"]["id"]

        # Faculty 1 (Dr. Turing) & Faculty 2 (Dr. Lovelace)
        fac1_res = client.post("/api/faculty", json={
            "facultyCode": "FAC_TURING_P4",
            "name": "Dr. Alan Turing P4",
            "designation": "Professor",
            "email": "turing.p4@university.edu",
            "maxHoursPerWeek": 16,
            "maxHoursPerDay": 4,
            "maxConsecutiveHours": 2
        })
        assert fac1_res.status_code == 201
        fac1_id = fac1_res.json()["data"]["id"]

        fac2_res = client.post("/api/faculty", json={
            "facultyCode": "FAC_ADA_P4",
            "name": "Dr. Ada Lovelace P4",
            "designation": "Professor",
            "email": "ada.p4@university.edu",
            "maxHoursPerWeek": 16,
            "maxHoursPerDay": 4,
            "maxConsecutiveHours": 2
        })
        assert fac2_res.status_code == 201
        fac2_id = fac2_res.json()["data"]["id"]

        # Subject 1 (Operating Systems) & Subject 2 (Algorithms Lab)
        sub1_res = client.post("/api/subjects", json={
            "name": "Operating Systems P4",
            "subjectCode": "CS101_P4",
            "programmeId": prog_id,
            "semesterId": sem_id,
            "subjectType": "THEORY",
            "defaultWeeklyHours": 3,
            "defaultBlockSize": 1,
            "requiresConsecutivePeriods": False
        })
        assert sub1_res.status_code == 201
        sub1_id = sub1_res.json()["data"]["id"]

        sub2_res = client.post("/api/subjects", json={
            "name": "Algorithms Lab P4",
            "subjectCode": "CS102_P4",
            "programmeId": prog_id,
            "semesterId": sem_id,
            "subjectType": "LAB",
            "defaultWeeklyHours": 2,
            "defaultBlockSize": 2,
            "requiresConsecutivePeriods": True
        })
        assert sub2_res.status_code == 201
        sub2_id = sub2_res.json()["data"]["id"]

        # Resource (Lab 1)
        res_res = client.post("/api/resources", json={
            "name": "Systems Lab P4",
            "code": "LAB_SYS_P4",
            "resourceType": "LAB",
            "capacity": 40
        })
        assert res_res.status_code == 201
        res_id = res_res.json()["data"]["id"]

        # ----------------------------------------------------
        # 2. FACULTY AVAILABILITY TESTS
        # ----------------------------------------------------
        # Rejection: cannot configure non-teaching slot (lunch)
        bad_avail = client.post("/api/faculty-availability", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "facultyId": fac1_id,
            "workingDayId": day1_id,
            "timeSlotId": slot_lunch_id,
            "availabilityStatus": "UNAVAILABLE"
        })
        assert bad_avail.status_code == 400

        # Successful creation: Mark Day1 Slot1 as UNAVAILABLE for Dr. Turing
        avail1 = client.post("/api/faculty-availability", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "facultyId": fac1_id,
            "workingDayId": day1_id,
            "timeSlotId": slot1_id,
            "availabilityStatus": "UNAVAILABLE",
            "reason": "Department Head duties"
        })
        assert avail1.status_code == 201
        avail1_data = avail1.json()["data"]
        assert avail1_data["availabilityStatus"] == "UNAVAILABLE"
        avail1_id = avail1_data["id"]

        # Conflict check: duplicate configuration for same slot -> 409
        dup_avail = client.post("/api/faculty-availability", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "facultyId": fac1_id,
            "workingDayId": day1_id,
            "timeSlotId": slot1_id,
            "availabilityStatus": "PREFERRED"
        })
        assert dup_avail.status_code == 409

        # Bulk Availability Update:
        # Set Day1 Slot2 as PREFERRED, Day2 Slot1 as AVOID, and Day1 Slot1 as AVAILABLE (removes exception)
        bulk_res = client.put("/api/faculty-availability/bulk", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "facultyId": fac1_id,
            "entries": [
                {
                    "workingDayId": day1_id,
                    "timeSlotId": slot1_id,
                    "availabilityStatus": "AVAILABLE"  # Clears exception
                },
                {
                    "workingDayId": day1_id,
                    "timeSlotId": slot2_id,
                    "availabilityStatus": "PREFERRED"
                },
                {
                    "workingDayId": day2_id,
                    "timeSlotId": slot1_id,
                    "availabilityStatus": "AVOID"
                }
            ]
        })
        assert bulk_res.status_code == 200
        # List availability for Dr. Turing: Slot1 should no longer be stored (AVAILABLE), only Slot2 (PREFERRED) and Day2 Slot1 (AVOID)
        list_avail = client.get(f"/api/faculty-availability?academicYearId={ay_id}&facultyId={fac1_id}")
        assert list_avail.status_code == 200
        avail_items = list_avail.json()["data"]
        assert len(avail_items) == 2
        statuses = {item["timeSlotId"]: item["availabilityStatus"] for item in avail_items}
        assert statuses[slot2_id] == "PREFERRED"

        # Now mark Dr. Turing UNAVAILABLE on Day 1 Slot 1 again for conflict checks
        client.post("/api/faculty-availability", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "facultyId": fac1_id,
            "workingDayId": day1_id,
            "timeSlotId": slot1_id,
            "availabilityStatus": "UNAVAILABLE"
        })

        # ----------------------------------------------------
        # 3. FIXED TIMETABLE SLOTS & CONFLICT DETECTION
        # ----------------------------------------------------
        # Rejection: cannot schedule fixed slot in non-teaching period
        bad_fixed = client.post("/api/fixed-slots", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_id,
            "workingDayId": day1_id,
            "timeSlotId": slot_lunch_id,
            "slotCategory": "LIBRARY",
            "title": "Library"
        })
        assert bad_fixed.status_code == 400

        # Rejection: cannot assign faculty to fixed slot if faculty is marked UNAVAILABLE in that slot
        unavail_fixed = client.post("/api/fixed-slots", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_id,
            "workingDayId": day1_id,
            "timeSlotId": slot1_id,
            "slotCategory": "SUBJECT",
            "subjectId": sub1_id,
            "facultyIds": [fac1_id],
            "title": "OS Theory"
        })
        assert unavail_fixed.status_code == 409
        assert "marked UNAVAILABLE" in unavail_fixed.json()["message"]

        # Successful creation: Assign Dr. Ada Lovelace to Day1 Slot1 for Class A
        fixed1 = client.post("/api/fixed-slots", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_id,
            "workingDayId": day1_id,
            "timeSlotId": slot1_id,
            "slotCategory": "SUBJECT",
            "subjectId": sub1_id,
            "facultyIds": [fac2_id],
            "resourceId": res_id,
            "title": "OS Theory with Ada",
            "isLocked": True
        })
        assert fixed1.status_code == 201
        fixed1_id = fixed1.json()["data"]["id"]

        # Conflict 1: Class Conflict (Class A already has a fixed slot on Day1 Slot1)
        cls_conflict = client.post("/api/fixed-slots", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_id,
            "workingDayId": day1_id,
            "timeSlotId": slot1_id,
            "slotCategory": "LIBRARY",
            "title": "Library"
        })
        assert cls_conflict.status_code == 409
        assert "already has a fixed slot" in cls_conflict.json()["message"]

        # Conflict 2: Faculty Conflict (Dr. Ada Lovelace is already teaching Class A on Day1 Slot1, cannot teach Class B)
        fac_conflict = client.post("/api/fixed-slots", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls2_id,
            "workingDayId": day1_id,
            "timeSlotId": slot1_id,
            "slotCategory": "SUBJECT",
            "subjectId": sub1_id,
            "facultyIds": [fac2_id],
            "title": "Clashing OS Session"
        })
        assert fac_conflict.status_code == 409
        assert "Faculty conflict" in fac_conflict.json()["message"]

        # Conflict 3: Resource Conflict (Lab 1 is already booked on Day1 Slot1 for Class A)
        res_conflict = client.post("/api/fixed-slots", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls2_id,
            "workingDayId": day1_id,
            "timeSlotId": slot1_id,
            "slotCategory": "OTHER",
            "resourceId": res_id,
            "title": "Clashing Lab Session"
        })
        assert res_conflict.status_code == 409
        assert "Resource conflict" in res_conflict.json()["message"]

        # ----------------------------------------------------
        # 4. GLOBAL SCHEDULING SETTINGS & SOFT WEIGHTS
        # ----------------------------------------------------
        # Rejection: invalid soft constraint weight (out of 1-10 range)
        bad_settings = client.post("/api/scheduling-settings", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "softConstraintWeights": {
                "subjectDistribution": 15  # invalid > 10
            }
        })
        assert bad_settings.status_code == 422

        # Successful settings creation
        settings_res = client.post("/api/scheduling-settings", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "maxFacultyHoursPerDay": 4,
            "maxFacultyConsecutiveHours": 2,
            "maxClassConsecutiveHours": 3,
            "avoidSameSubjectMultipleTimesPerDay": True,
            "distributeSubjectsAcrossWeek": True,
            "softConstraintWeights": {
                "subjectDistribution": 9,
                "facultyLoadBalance": 8,
                "avoidConsecutiveHours": 7,
                "preferredAvailability": 8,
                "avoidAvailability": 6,
                "avoidLastPeriod": 4
            }
        })
        assert settings_res.status_code == 201
        settings_id = settings_res.json()["data"]["id"]

        # Duplicate settings for same AY + SemType rejected
        dup_settings = client.post("/api/scheduling-settings", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
        })
        assert dup_settings.status_code == 409

        # Fetch current settings
        cur_settings = client.get(f"/api/scheduling-settings/current?academicYearId={ay_id}&semesterTypeId={st_id}")
        assert cur_settings.status_code == 200
        assert cur_settings.json()["data"]["softConstraintWeights"]["subjectDistribution"] == 9

        # ----------------------------------------------------
        # 5. CLASS CONSTRAINTS
        # ----------------------------------------------------
        class_cons_res = client.post("/api/class-constraints", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_id,
            "maxPeriodsPerDay": 5,
            "maxConsecutivePeriods": 2,
            "allowFreePeriods": True,
            "blockedSlotIds": [slot2_id],
            "notes": "Reserve slot 2 for tutorial"
        })
        assert class_cons_res.status_code == 201
        c_cons_id = class_cons_res.json()["data"]["id"]

        # Duplicate class constraint rejected
        dup_c_cons = client.post("/api/class-constraints", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_id,
        })
        assert dup_c_cons.status_code == 409

        # ----------------------------------------------------
        # 6. FACULTY CONSTRAINTS
        # ----------------------------------------------------
        fac_cons_res = client.post("/api/faculty-constraints", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "facultyId": fac1_id,
            "preferredMaxHoursPerDay": 3,
            "preferredMinHoursPerDay": 1,
            "avoidFirstPeriod": True,
            "preferCompactSchedule": True,
            "notes": "Research afternoon preference"
        })
        assert fac_cons_res.status_code == 201
        f_cons_id = fac_cons_res.json()["data"]["id"]

        # Duplicate faculty constraint rejected
        dup_f_cons = client.post("/api/faculty-constraints", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "facultyId": fac1_id,
        })
        assert dup_f_cons.status_code == 409

        # ----------------------------------------------------
        # 7. SUBJECT PREFERENCES
        # ----------------------------------------------------
        sub_cons_res = client.post("/api/subject-constraints", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_id,
            "subjectId": sub1_id,
            "maxSessionsPerDay": 1,
            "minDaysBetweenSessions": 1,
            "preferredWorkingDayIds": [day1_id],
            "avoidTimeSlotIds": [slot2_id],
            "notes": "Theory subject distribution"
        })
        assert sub_cons_res.status_code == 201
        s_cons_id = sub_cons_res.json()["data"]["id"]

        # Duplicate subject constraint rejected
        dup_s_cons = client.post("/api/subject-constraints", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_id,
            "subjectId": sub1_id,
        })
        assert dup_s_cons.status_code == 409

        # ----------------------------------------------------
        # 8. SCHEDULER PRE-GENERATION VALIDATION ENGINE
        # ----------------------------------------------------
        # At this stage, Class A has no allocations, so validation should return errors
        val_res1 = client.post("/api/scheduler/validate", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id
        })
        assert val_res1.status_code == 200
        vdata1 = val_res1.json()["data"]
        assert vdata1["ready"] is False
        assert vdata1["summary"]["errors"] > 0
        issue_codes = [issue["code"] for issue in vdata1["issues"]]
        assert "CLASS_WITHOUT_ALLOCATIONS" in issue_codes

        # Add allocation that intentionally overloads faculty to test FACULTY_OVERLOAD check
        # Max hours for Dr. Alan Turing is 16. We create allocation for 20 hours.
        overload_alloc = client.post("/api/faculty-allocations", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_id,
            "subjectId": sub1_id,
            "facultyIds": [fac1_id],
            "weeklyHours": 20,
            "blockSize": 1,
            "requiresConsecutivePeriods": False
        })
        assert overload_alloc.status_code == 201
        overload_alloc_id = overload_alloc.json()["data"]["id"]

        val_res2 = client.post("/api/scheduler/validate", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id
        })
        vdata2 = val_res2.json()["data"]
        issue_codes2 = [issue["code"] for issue in vdata2["issues"]]
        assert "FACULTY_OVERLOAD" in issue_codes2
        assert any("20 allocated hours, exceeding maximum weekly workload" in issue["message"] for issue in vdata2["issues"])
        # Also, 20 hours exceeds total class capacity (2 days * 2 teaching periods = 4 slots)
        assert "CLASS_CAPACITY_EXCEEDED" in issue_codes2

        # Delete the overload allocation
        client.delete(f"/api/faculty-allocations/{overload_alloc_id}")

        # ----------------------------------------------------
        # 9. SCHEDULER READINESS API
        # ----------------------------------------------------
        ready_res = client.get(f"/api/scheduler/readiness?academicYearId={ay_id}&semesterTypeId={st_id}")
        assert ready_res.status_code == 200
        rdata = ready_res.json()["data"]
        assert rdata["academicYearId"] == ay_id
        assert rdata["classes"] == 2
        assert rdata["faculty"] == 2
        assert rdata["fixedSlots"] == 1
        assert rdata["unavailableFacultySlots"] == 1
        assert rdata["ready"] is False  # Because classes have no valid allocations yet

        print("\nAll Phase 4 backend tests executed successfully!")

if __name__ == "__main__":
    test_full_phase4_suite()
