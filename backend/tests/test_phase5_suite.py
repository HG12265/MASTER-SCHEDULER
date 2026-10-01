import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from starlette.testclient import TestClient
from pymongo import MongoClient
from app.main import app

def cleanup_test_records():
    client = MongoClient("mongodb://localhost:27017")
    db = client["master_scheduler"]
    test_filter = {"$regex": "test|msc|p4|p5|p6", "$options": "i"}

    # Phase 5 collections
    db["timetables"].delete_many({})
    db["timetable_entries"].delete_many({})

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

def test_full_phase5_suite():
    cleanup_test_records()
    with TestClient(app) as client:
        # ----------------------------------------------------
        # 1. SETUP MASTER ACADEMIC STRUCTURE
        # ----------------------------------------------------
        ay_res = client.post("/api/academic-years", json={
            "name": "2026-2027 P5 Test",
            "startYear": 2026,
            "endYear": 2027,
            "isCurrent": True
        })
        assert ay_res.status_code == 201
        ay_id = ay_res.json()["data"]["id"]

        st_res = client.post("/api/semester-types", json={
            "name": "Odd Semester P5",
            "code": "ODD_P5",
            "description": "Odd term for CP-SAT test"
        })
        assert st_res.status_code == 201
        st_id = st_res.json()["data"]["id"]

        # Working Days: Mon, Tue, Wed
        days = []
        for name, short, order in [("Monday P5", "MON_P5", 1), ("Tuesday P5", "TUE_P5", 2), ("Wednesday P5", "WED_P5", 3)]:
            d_res = client.post("/api/working-days", json={
                "name": name,
                "shortName": short,
                "dayOrder": order,
                "isWorkingDay": True
            })
            assert d_res.status_code == 201
            days.append(d_res.json()["data"]["id"])
        mon_id, tue_id, wed_id = days

        # Time Slots: P1 (09-10), P2 (10-11), P3 (11-12), Lunch (12-13, Non-teaching), P4 (13-14), P5 (14-15)
        slots = []
        slot_defs = [
            ("P1 P5", "09:00", "10:00", 1, True, "PERIOD"),
            ("P2 P5", "10:00", "11:00", 2, True, "PERIOD"),
            ("P3 P5", "11:00", "12:00", 3, True, "PERIOD"),
            ("Lunch P5", "12:00", "13:00", 4, False, "LUNCH"),
            ("P4 P5", "13:00", "14:00", 5, True, "PERIOD"),
            ("P5 P5", "14:00", "15:00", 6, True, "PERIOD"),
        ]
        for name, s_time, e_time, order, is_teach, s_type in slot_defs:
            s_res = client.post("/api/time-slots", json={
                "name": name,
                "startTime": s_time,
                "endTime": e_time,
                "slotOrder": order,
                "isTeachingSlot": is_teach,
                "slotType": s_type
            })
            assert s_res.status_code == 201
            slots.append(s_res.json()["data"]["id"])
        p1_id, p2_id, p3_id, lunch_id, p4_id, p5_id = slots

        # Programme & Semester
        prog_res = client.post("/api/programmes", json={
            "name": "Computer Applications P5",
            "code": "MCA_P5",
            "shortName": "MCA-P5",
            "totalSemesters": 4
        })
        assert prog_res.status_code == 201
        prog_id = prog_res.json()["data"]["id"]

        sem_res = client.post("/api/semesters", json={
            "name": "Semester 1 P5",
            "displayName": "MCA Sem 1 P5",
            "semesterNumber": 1,
            "programmeId": prog_id
        })
        assert sem_res.status_code == 201
        sem_id = sem_res.json()["data"]["id"]

        # 2 Classes: Class A & Class B
        cls_a_res = client.post("/api/classes", json={
            "name": "MCA Class A P5",
            "displayName": "MCA-A P5",
            "programmeId": prog_id,
            "semesterId": sem_id,
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "section": "A",
            "studentStrength": 50
        })
        assert cls_a_res.status_code == 201
        cls_a_id = cls_a_res.json()["data"]["id"]

        cls_b_res = client.post("/api/classes", json={
            "name": "MCA Class B P5",
            "displayName": "MCA-B P5",
            "programmeId": prog_id,
            "semesterId": sem_id,
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "section": "B",
            "studentStrength": 50
        })
        assert cls_b_res.status_code == 201
        cls_b_id = cls_b_res.json()["data"]["id"]

        # Faculty Members:
        # Fac 1: Dr. Alan Turing (shares teaching between Class A and B)
        fac1_res = client.post("/api/faculty", json={
            "facultyCode": "FAC_TURING_P5",
            "name": "Dr. Alan Turing P5",
            "designation": "Professor",
            "email": "turing.p5@university.edu",
            "maxHoursPerWeek": 16,
            "maxHoursPerDay": 4,
            "maxConsecutiveHours": 2
        })
        assert fac1_res.status_code == 201
        fac1_id = fac1_res.json()["data"]["id"]

        # Fac 2: Dr. Ada Lovelace (co-teaches lab)
        fac2_res = client.post("/api/faculty", json={
            "facultyCode": "FAC_ADA_P5",
            "name": "Dr. Ada Lovelace P5",
            "designation": "Professor",
            "email": "ada.p5@university.edu",
            "maxHoursPerWeek": 16,
            "maxHoursPerDay": 4,
            "maxConsecutiveHours": 2
        })
        assert fac2_res.status_code == 201
        fac2_id = fac2_res.json()["data"]["id"]

        # Fac 3: Dr. Grace Hopper (theory teacher)
        fac3_res = client.post("/api/faculty", json={
            "facultyCode": "FAC_HOPPER_P5",
            "name": "Dr. Grace Hopper P5",
            "designation": "Associate Professor",
            "email": "hopper.p5@university.edu",
            "maxHoursPerWeek": 16,
            "maxHoursPerDay": 4,
            "maxConsecutiveHours": 2
        })
        assert fac3_res.status_code == 201
        fac3_id = fac3_res.json()["data"]["id"]

        # Resources: Lab 1 & Lab 2
        res1_res = client.post("/api/resources", json={
            "name": "Advanced Computing Lab P5",
            "code": "LAB_ADV_P5",
            "resourceType": "LAB",
            "capacity": 50
        })
        assert res1_res.status_code == 201
        res1_id = res1_res.json()["data"]["id"]

        # Subjects:
        # Sub 1: Operating Systems (Theory, 3 hrs/week)
        sub1_res = client.post("/api/subjects", json={
            "name": "Operating Systems P5",
            "subjectCode": "CS201_P5",
            "programmeId": prog_id,
            "semesterId": sem_id,
            "subjectType": "THEORY",
            "defaultWeeklyHours": 3,
            "defaultBlockSize": 1,
            "requiresConsecutivePeriods": False
        })
        assert sub1_res.status_code == 201
        sub1_id = sub1_res.json()["data"]["id"]

        # Sub 2: Data Structures (Theory, 2 hrs/week)
        sub2_res = client.post("/api/subjects", json={
            "name": "Data Structures P5",
            "subjectCode": "CS202_P5",
            "programmeId": prog_id,
            "semesterId": sem_id,
            "subjectType": "THEORY",
            "defaultWeeklyHours": 2,
            "defaultBlockSize": 1,
            "requiresConsecutivePeriods": False
        })
        assert sub2_res.status_code == 201
        sub2_id = sub2_res.json()["data"]["id"]

        # Sub 3: Systems Lab (Lab, 2 hrs/week, blockSize=2, requiresConsecutive=True)
        sub3_res = client.post("/api/subjects", json={
            "name": "Systems Programming Lab P5",
            "subjectCode": "CS203_P5",
            "programmeId": prog_id,
            "semesterId": sem_id,
            "subjectType": "LAB",
            "defaultWeeklyHours": 2,
            "defaultBlockSize": 2,
            "requiresConsecutivePeriods": True
        })
        assert sub3_res.status_code == 201
        sub3_id = sub3_res.json()["data"]["id"]

        # ----------------------------------------------------
        # 2. ALLOCATIONS:
        # Class A:
        # - OS (3 hrs) -> Dr. Turing
        # - DS (2 hrs) -> Dr. Hopper
        # - Lab (2 hrs) -> Dr. Turing + Dr. Lovelace (Multi-faculty, requires LAB_ADV_P5)
        # Total for Class A = 7 hrs
        # ----------------------------------------------------
        alloc_a1 = client.post("/api/faculty-allocations", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_a_id,
            "subjectId": sub1_id,
            "facultyIds": [fac1_id],
            "weeklyHours": 3,
            "blockSize": 1,
            "requiresConsecutivePeriods": False
        })
        assert alloc_a1.status_code == 201

        alloc_a2 = client.post("/api/faculty-allocations", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_a_id,
            "subjectId": sub2_id,
            "facultyIds": [fac3_id],
            "weeklyHours": 2,
            "blockSize": 1,
            "requiresConsecutivePeriods": False
        })
        assert alloc_a2.status_code == 201

        alloc_a3 = client.post("/api/faculty-allocations", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_a_id,
            "subjectId": sub3_id,
            "facultyIds": [fac1_id, fac2_id],
            "preferredResourceId": res1_id,
            "weeklyHours": 2,
            "blockSize": 2,
            "requiresConsecutivePeriods": True
        })
        assert alloc_a3.status_code == 201

        # Class B Allocations:
        # - OS (2 hrs) -> Dr. Turing (Shared faculty with Class A!)
        # - DS (2 hrs) -> Dr. Hopper
        # Total for Class B = 4 hrs
        alloc_b1 = client.post("/api/faculty-allocations", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_b_id,
            "subjectId": sub1_id,
            "facultyIds": [fac1_id],
            "weeklyHours": 2,
            "blockSize": 1,
            "requiresConsecutivePeriods": False
        })
        assert alloc_b1.status_code == 201

        alloc_b2 = client.post("/api/faculty-allocations", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_b_id,
            "subjectId": sub2_id,
            "facultyIds": [fac3_id],
            "weeklyHours": 2,
            "blockSize": 1,
            "requiresConsecutivePeriods": False
        })
        assert alloc_b2.status_code == 201

        # ----------------------------------------------------
        # 3. CONSTRAINTS, AVAILABILITY, FIXED SLOTS
        # ----------------------------------------------------
        # Faculty 1 (Dr. Turing) is UNAVAILABLE on Monday P1
        unavail_res = client.post("/api/faculty-availability", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "facultyId": fac1_id,
            "workingDayId": mon_id,
            "timeSlotId": p1_id,
            "availabilityStatus": "UNAVAILABLE",
            "reason": "Research Seminar"
        })
        assert unavail_res.status_code == 201

        # Faculty 1 is PREFERRED on Tuesday P1
        pref_res = client.post("/api/faculty-availability", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "facultyId": fac1_id,
            "workingDayId": tue_id,
            "timeSlotId": p1_id,
            "availabilityStatus": "PREFERRED"
        })
        assert pref_res.status_code == 201

        # Fixed Non-Subject Slot: Library for Class A on Wednesday P5 (Locked)
        fixed_lib = client.post("/api/fixed-slots", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_a_id,
            "workingDayId": wed_id,
            "timeSlotId": p5_id,
            "slotCategory": "LIBRARY",
            "title": "Central Library Reading",
            "isLocked": True
        })
        assert fixed_lib.status_code == 201

        # Fixed Subject Slot: 1 hour of OS for Class A is pinned on Tuesday P2
        fixed_subj = client.post("/api/fixed-slots", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_a_id,
            "workingDayId": tue_id,
            "timeSlotId": p2_id,
            "slotCategory": "SUBJECT",
            "subjectId": sub1_id,
            "facultyIds": [fac1_id],
            "title": "OS Lecture 1",
            "isLocked": True
        })
        assert fixed_subj.status_code == 201

        # Scheduling Settings: Set soft constraint weights
        client.post("/api/scheduling-settings", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "maxFacultyHoursPerDay": 4,
            "maxFacultyConsecutiveHours": 2,
            "maxClassConsecutiveHours": 3,
            "avoidSameSubjectMultipleTimesPerDay": True,
            "distributeSubjectsAcrossWeek": True,
            "softConstraintWeights": {
                "subjectDistribution": 8,
                "preferredAvailability": 9,
                "avoidAvailability": 5,
                "labBlockContinuity": 9
            }
        })

        # ----------------------------------------------------
        # 4. EXECUTE AUTOMATIC GENERATION VIA CP-SAT
        # ----------------------------------------------------
        gen_res = client.post("/api/scheduler/generate", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "solverOptions": {
                "maxSolveSeconds": 15,
                "numWorkers": 2,
                "randomSeed": 42
            }
        })
        assert gen_res.status_code == 200, gen_res.text
        gen_data = gen_res.json()
        assert gen_data["success"] is True
        timetable = gen_data["data"]
        tt_id = timetable["id"]
        assert timetable["solverStatus"] in ("OPTIMAL", "FEASIBLE")
        assert timetable["version"] == 1
        assert timetable["status"] == "DRAFT"

        # ----------------------------------------------------
        # 5. POST-GENERATION INTEGRITY VERIFICATION
        # ----------------------------------------------------
        # Fetch entries
        entries_res = client.get(f"/api/timetables/{tt_id}/entries")
        assert entries_res.status_code == 200
        entries = entries_res.json()["data"]
        assert len(entries) > 0

        # Invariant 1: Class uniqueness per (day, slot)
        class_slots = set()
        for e in entries:
            key = (e["classId"], e["workingDayId"], e["timeSlotId"])
            assert key not in class_slots, f"Class collision detected at {key}"
            class_slots.add(key)

        # Invariant 2: Faculty uniqueness per (day, slot)
        # Dr. Turing teaches both Class A and B. He must NEVER be double-booked!
        faculty_slots = set()
        for e in entries:
            for fid in e["facultyIds"]:
                f_key = (fid, e["workingDayId"], e["timeSlotId"])
                assert f_key not in faculty_slots, f"Faculty collision detected for {fid} at {f_key}"
                faculty_slots.add(f_key)

        # Invariant 3: Faculty unavailability respected
        # Dr. Turing was unavailable on Monday P1. He must not be scheduled there.
        for e in entries:
            if fac1_id in e["facultyIds"]:
                assert not (e["workingDayId"] == mon_id and e["timeSlotId"] == p1_id), "Faculty scheduled during UNAVAILABLE slot!"

        # Invariant 4: Fixed slots preserved
        # Wed P5 Library in Class A
        wed_p5_entry = [e for e in entries if e["classId"] == cls_a_id and e["workingDayId"] == wed_id and e["timeSlotId"] == p5_id]
        assert len(wed_p5_entry) == 1
        assert wed_p5_entry[0]["isFixed"] is True
        assert wed_p5_entry[0]["entryType"] == "LIBRARY"

        # Tue P2 Fixed OS in Class A
        tue_p2_entry = [e for e in entries if e["classId"] == cls_a_id and e["workingDayId"] == tue_id and e["timeSlotId"] == p2_id]
        assert len(tue_p2_entry) == 1
        assert tue_p2_entry[0]["isFixed"] is True
        assert tue_p2_entry[0]["subjectId"] == sub1_id

        # Invariant 5: Exact weekly hours satisfied
        # Class A OS requires 3 hrs total (1 fixed + 2 generated = 3 total)
        os_class_a = [e for e in entries if e["classId"] == cls_a_id and e["subjectId"] == sub1_id]
        assert len(os_class_a) == 3, f"Expected 3 periods of OS for Class A, found {len(os_class_a)}"

        # Class A DS requires 2 hrs
        ds_class_a = [e for e in entries if e["classId"] == cls_a_id and e["subjectId"] == sub2_id]
        assert len(ds_class_a) == 2

        # Class A Lab requires 2 consecutive hrs
        lab_class_a = [e for e in entries if e["classId"] == cls_a_id and e["subjectId"] == sub3_id]
        assert len(lab_class_a) == 2
        # Verify lab slots are on the same day and contiguous
        assert lab_class_a[0]["workingDayId"] == lab_class_a[1]["workingDayId"]
        # Multi-faculty lab: both Dr. Turing and Dr. Lovelace must be present
        for lab_slot in lab_class_a:
            assert fac1_id in lab_slot["facultyIds"]
            assert fac2_id in lab_slot["facultyIds"]
            # Must be assigned to Advanced Computing Lab
            assert lab_slot["resourceId"] == res1_id

        # Invariant 6: Lunch break boundary
        # No session should be scheduled in Lunch slot (it's non-teaching)
        lunch_entries = [e for e in entries if e["timeSlotId"] == lunch_id]
        assert len(lunch_entries) == 0, "Activity scheduled during lunch break!"

        # Invariant 7: Faculty daily limit respected (max 4 hrs/day for Dr. Turing)
        turing_by_day = {mon_id: 0, tue_id: 0, wed_id: 0}
        for e in entries:
            if fac1_id in e["facultyIds"]:
                turing_by_day[e["workingDayId"]] += 1
        for d_id, count in turing_by_day.items():
            assert count <= 4, f"Dr. Turing daily limit exceeded on day {d_id} ({count} > 4)"

        # ----------------------------------------------------
        # 6. TIMETABLE QUERY & VIEWS APIs
        # ----------------------------------------------------
        # Class timetable view
        cls_tt = client.get(f"/api/timetables/{tt_id}/classes/{cls_a_id}")
        assert cls_tt.status_code == 200
        assert len(cls_tt.json()["data"]) == 8  # 7 subject periods + 1 fixed library = 8

        # Faculty timetable view
        fac_tt = client.get(f"/api/timetables/{tt_id}/faculty/{fac1_id}")
        assert fac_tt.status_code == 200
        # Dr. Turing teaches 3 hrs OS (Class A) + 2 hrs Lab (Class A) + 2 hrs OS (Class B) = 7 hrs
        assert len(fac_tt.json()["data"]) == 7

        # Master view
        master_res = client.get(f"/api/timetables/{tt_id}/master")
        assert master_res.status_code == 200
        mdata = master_res.json()["data"]
        assert len(mdata["classes"]) == 2
        assert len(mdata["workingDays"]) == 3
        assert len(mdata["teachingSlots"]) == 5

        # List timetables
        tt_list = client.get(f"/api/timetables?academicYearId={ay_id}&semesterTypeId={st_id}")
        assert tt_list.status_code == 200
        assert len(tt_list.json()["data"]) == 1

        # ----------------------------------------------------
        # 7. INFEASIBILITY DETECTION & DIAGNOSTICS TEST
        # ----------------------------------------------------
        # Create an impossible configuration:
        # Class B requests a 10-hour subject, but only 5 daily slots * 3 days = 15 total slots exist,
        # and Dr. Hopper's max weekly hours is 16. If we set maxHoursPerDay=1 for Dr. Hopper,
        # she can only teach 3 periods across the 3 days, making 10 periods mathematically impossible!
        impossible_fac = client.post("/api/faculty", json={
            "facultyCode": "FAC_IMPOSSIBLE_P5",
            "name": "Dr. Impossible P5",
            "designation": "Lecturer",
            "maxHoursPerWeek": 16,
            "maxHoursPerDay": 1,  # Only 1 hr per day! Across 3 days = max 3 hrs!
            "maxConsecutiveHours": 1
        }).json()["data"]["id"]

        impossible_sub = client.post("/api/subjects", json={
            "name": "Massive Theory P5",
            "subjectCode": "CS999_P5",
            "programmeId": prog_id,
            "semesterId": sem_id,
            "subjectType": "THEORY",
            "defaultWeeklyHours": 10,  # 10 hrs required, but fac can only teach 3!
            "defaultBlockSize": 1,
            "requiresConsecutivePeriods": False
        }).json()["data"]["id"]

        client.post("/api/faculty-allocations", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_b_id,
            "subjectId": impossible_sub,
            "facultyIds": [impossible_fac],
            "weeklyHours": 10,
            "blockSize": 1,
            "requiresConsecutivePeriods": False
        })

        # Run generator on impossible setup
        infeasible_res = client.post("/api/scheduler/generate", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "solverOptions": {
                "maxSolveSeconds": 5,
                "numWorkers": 2
            }
        })
        assert infeasible_res.status_code == 200
        inf_json = infeasible_res.json()
        assert inf_json["success"] is False
        assert inf_json["data"]["solverStatus"] == "INFEASIBLE"
        assert len(inf_json["data"]["diagnostics"]) > 0

        # Delete draft timetable
        del_res = client.delete(f"/api/timetables/{tt_id}")
        assert del_res.status_code == 200

        cleanup_test_records()
        print("\nAll Phase 5 CP-SAT tests and integrity checks passed!")

if __name__ == "__main__":
    test_full_phase5_suite()
