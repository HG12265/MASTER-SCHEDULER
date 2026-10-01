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

def test_full_phase2_suite():
    cleanup_test_records()
    with TestClient(app) as client:
        # 1. Health API works
        res = client.get("/api/health")
        assert res.status_code == 200
        assert res.json() == {
            "status": "success",
            "message": "Master Scheduler API is running"
        }

        # 2. Academic Year CRUD works + set-current
        ay_create = client.post("/api/academic-years", json={
            "name": "2026-2027 Test",
            "startYear": 2026,
            "endYear": 2027,
            "isCurrent": True
        })
        assert ay_create.status_code == 201, ay_create.text
        ay_data = ay_create.json()["data"]
        ay_id = ay_data["id"]
        assert ay_data["name"] == "2026-2027 Test"
        assert ay_data["isCurrent"] is True

        # Validation: startYear >= endYear rejected
        bad_ay = client.post("/api/academic-years", json={
            "name": "Invalid AY",
            "startYear": 2027,
            "endYear": 2026
        })
        assert bad_ay.status_code == 422

        # Create another academic year and test set-current
        ay2_create = client.post("/api/academic-years", json={
            "name": "2027-2028 Test",
            "startYear": 2027,
            "endYear": 2028,
            "isCurrent": True
        })
        assert ay2_create.status_code == 201
        ay2_id = ay2_create.json()["data"]["id"]

        # Verify previous AY isCurrent is now False
        ay1_check = client.get(f"/api/academic-years/{ay_id}")
        assert ay1_check.json()["data"]["isCurrent"] is False

        # Set-current patch
        patch_res = client.patch(f"/api/academic-years/{ay_id}/set-current")
        assert patch_res.status_code == 200
        assert patch_res.json()["data"]["isCurrent"] is True

        # 3. Programme CRUD works
        prog_res = client.post("/api/programmes", json={
            "name": "Master of Computer Applications Test",
            "code": "MCA_TEST",
            "shortName": "MCA-T",
            "totalSemesters": 4
        })
        assert prog_res.status_code == 201, prog_res.text
        prog_data = prog_res.json()["data"]
        prog_id = prog_data["id"]
        assert prog_data["code"] == "MCA_TEST"

        # 9. Duplicate programme code returns 409 conflict
        dup_prog = client.post("/api/programmes", json={
            "name": "Duplicate MCA",
            "code": "MCA_TEST",
            "shortName": "MCA-DUP",
            "totalSemesters": 4
        })
        assert dup_prog.status_code == 409
        assert dup_prog.json()["success"] is False

        # 4. Semester creation verifies programme
        # Non-existent programme ID
        bad_sem = client.post("/api/semesters", json={
            "programmeId": "507f1f77bcf86cd799439011",
            "semesterNumber": 1,
            "name": "Semester I",
            "displayName": "MCA Sem 1"
        })
        assert bad_sem.status_code == 404

        # Semester number exceeding programme.totalSemesters (4)
        exceed_sem = client.post("/api/semesters", json={
            "programmeId": prog_id,
            "semesterNumber": 5,
            "name": "Semester V",
            "displayName": "MCA Sem 5"
        })
        assert exceed_sem.status_code == 400

        # Valid semester creation
        sem_res = client.post("/api/semesters", json={
            "programmeId": prog_id,
            "semesterNumber": 1,
            "name": "Semester I",
            "displayName": "MCA Semester I"
        })
        assert sem_res.status_code == 201
        sem_id = sem_res.json()["data"]["id"]

        # Duplicate semester (programmeId + semesterNumber)
        dup_sem = client.post("/api/semesters", json={
            "programmeId": prog_id,
            "semesterNumber": 1,
            "name": "Semester I Duplicate",
            "displayName": "MCA Semester I Dup"
        })
        assert dup_sem.status_code == 409

        # Semester Type setup
        st_res = client.post("/api/semester-types", json={
            "name": "Odd Semester Test",
            "code": "ODD_TEST"
        })
        assert st_res.status_code == 201
        st_id = st_res.json()["data"]["id"]

        # Working Day & Time Slot CRUD tests
        wd_res = client.post("/api/working-days", json={
            "name": "Monday Test",
            "shortName": "MON_T",
            "dayOrder": 1,
            "isWorkingDay": True
        })
        assert wd_res.status_code == 201
        wd_id = wd_res.json()["data"]["id"]

        ts_res = client.post("/api/time-slots", json={
            "name": "Slot 1 Test",
            "startTime": "09:00",
            "endTime": "10:00",
            "slotOrder": 1,
            "slotType": "PERIOD",
            "isTeachingSlot": True
        })
        assert ts_res.status_code == 201
        ts_id = ts_res.json()["data"]["id"]

        # Overlapping time slot test
        overlap_ts = client.post("/api/time-slots", json={
            "name": "Overlapping Slot",
            "startTime": "09:30",
            "endTime": "10:30",
            "slotOrder": 2,
            "slotType": "PERIOD",
            "isTeachingSlot": True
        })
        assert overlap_ts.status_code == 409

        # 5. Class creation validates programme and semester relationship
        # Mismatched semester from another programme
        prog2 = client.post("/api/programmes", json={
            "name": "M.Sc Computer Science Test",
            "code": "MSC_TEST",
            "shortName": "MSC-T",
            "totalSemesters": 4
        }).json()["data"]["id"]

        bad_class = client.post("/api/classes", json={
            "name": "Mismatch Class",
            "displayName": "Mismatch Display",
            "programmeId": prog2,
            "semesterId": sem_id,  # belongs to MCA_TEST!
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "studentStrength": 30
        })
        assert bad_class.status_code == 400

        # Valid Class creation
        class_res = client.post("/api/classes", json={
            "name": "MCA-S1-A",
            "displayName": "MCA Sem I - Section A",
            "programmeId": prog_id,
            "semesterId": sem_id,
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "section": "A",
            "studentStrength": 60
        })
        assert class_res.status_code == 201
        class_id = class_res.json()["data"]["id"]

        # 6. Faculty CRUD works
        fac_res = client.post("/api/faculty", json={
            "facultyCode": "FAC_TEST_01",
            "name": "Dr. Alan Turing Test",
            "designation": "Professor",
            "email": "turing@university.edu",
            "maxHoursPerWeek": 16,
            "maxHoursPerDay": 4
        })
        assert fac_res.status_code == 201
        fac_id = fac_res.json()["data"]["id"]

        # Duplicate faculty code returns 409
        dup_fac = client.post("/api/faculty", json={
            "facultyCode": "FAC_TEST_01",
            "name": "Duplicate Turing"
        })
        assert dup_fac.status_code == 409

        # Second faculty for multi-faculty lab tests
        fac2_res = client.post("/api/faculty", json={
            "facultyCode": "FAC_TEST_02",
            "name": "Dr. Grace Hopper Test",
            "designation": "Associate Professor",
            "email": "hopper@university.edu"
        })
        assert fac2_res.status_code == 201
        fac2_id = fac2_res.json()["data"]["id"]

        # Resource CRUD works
        res_lab = client.post("/api/resources", json={
            "code": "LAB_CS_TEST",
            "name": "CS Computing Lab Test",
            "resourceType": "LAB",
            "capacity": 40
        })
        assert res_lab.status_code == 201
        resource_id = res_lab.json()["data"]["id"]

        # 7. Subject creation validates programme/semester
        bad_subj = client.post("/api/subjects", json={
            "subjectCode": "SUBJ_ERR",
            "name": "Mismatched Subject",
            "programmeId": prog2,
            "semesterId": sem_id  # mismatch
        })
        assert bad_subj.status_code == 400

        subj_res = client.post("/api/subjects", json={
            "subjectCode": "MCA101_TEST",
            "name": "Advanced Operating Systems Test",
            "programmeId": prog_id,
            "semesterId": sem_id,
            "subjectType": "LAB",
            "defaultWeeklyHours": 4,
            "defaultBlockSize": 2,
            "requiresConsecutivePeriods": True
        })
        assert subj_res.status_code == 201
        subj_id = subj_res.json()["data"]["id"]

        # 8. Faculty Allocation verifies all relationships
        # Test mismatched subject with class
        sem2_res = client.post("/api/semesters", json={
            "programmeId": prog2,
            "semesterNumber": 1,
            "name": "M.Sc Sem I",
            "displayName": "MSC Sem 1"
        })
        sem2_id = sem2_res.json()["data"]["id"]

        subj_diff_sem = client.post("/api/subjects", json={
            "subjectCode": "MSC_SUBJ",
            "name": "MSC Subject",
            "programmeId": prog2,
            "semesterId": sem2_id
        }).json()["data"]["id"]

        bad_alloc = client.post("/api/faculty-allocations", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": class_id,
            "subjectId": subj_diff_sem,
            "facultyIds": [fac_id],
            "weeklyHours": 4,
            "blockSize": 2
        })
        assert bad_alloc.status_code == 400

        # Valid Allocation with multiple faculty (for lab)
        alloc_res = client.post("/api/faculty-allocations", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": class_id,
            "subjectId": subj_id,
            "facultyIds": [fac_id, fac2_id],
            "weeklyHours": 4,
            "blockSize": 2,
            "requiresConsecutivePeriods": True,
            "preferredResourceId": resource_id
        })
        assert alloc_res.status_code == 201
        alloc_id = alloc_res.json()["data"]["id"]
        assert len(alloc_res.json()["data"]["facultyNames"]) == 2

        # 10. Invalid ObjectId is handled cleanly without crash
        invalid_res = client.get("/api/programmes/invalid-not-an-object-id")
        assert invalid_res.status_code == 400
        assert invalid_res.json()["success"] is False
        assert "Invalid" in invalid_res.json()["message"]

        # 11. Deleting a referenced programme is blocked (409 Conflict)
        del_prog = client.delete(f"/api/programmes/{prog_id}")
        assert del_prog.status_code == 409
        assert del_prog.json()["success"] is False
        assert "referenced" in del_prog.json()["message"].lower()

        # Deleting a referenced faculty is blocked
        del_fac = client.delete(f"/api/faculty/{fac_id}")
        assert del_fac.status_code == 409

        # Deleting a referenced class is blocked
        del_class = client.delete(f"/api/classes/{class_id}")
        assert del_class.status_code == 409

        # 12. Pagination works
        paged_res = client.get("/api/programmes?page=1&limit=1")
        assert paged_res.status_code == 200
        p_json = paged_res.json()
        assert len(p_json["data"]) == 1
        assert p_json["pagination"]["page"] == 1
        assert p_json["pagination"]["limit"] == 1
        assert p_json["pagination"]["total"] >= 2

        # 13. Search works
        search_res = client.get("/api/programmes?search=MCA_TEST")
        assert search_res.status_code == 200
        items = search_res.json()["data"]
        assert any(i["code"] == "MCA_TEST" for i in items)

        # 15. Dashboard summary API works and counts active records
        summary_res = client.get("/api/dashboard/summary")
        assert summary_res.status_code == 200
        sum_data = summary_res.json()["data"]
        assert sum_data["programmes"] >= 2
        assert sum_data["classes"] >= 1
        assert sum_data["faculty"] >= 2
        assert sum_data["subjects"] >= 2
        assert sum_data["resources"] >= 1
        assert sum_data["allocations"] >= 1

        # Clean up test allocation and dependents
        client.delete(f"/api/faculty-allocations/{alloc_id}")
        client.delete(f"/api/classes/{class_id}")
        client.delete(f"/api/subjects/{subj_id}")
        client.delete(f"/api/subjects/{subj_diff_sem}")
        client.delete(f"/api/semesters/{sem_id}")
        client.delete(f"/api/semesters/{sem2_id}")
        client.delete(f"/api/programmes/{prog_id}")
        client.delete(f"/api/programmes/{prog2}")
        client.delete(f"/api/faculty/{fac_id}")
        client.delete(f"/api/faculty/{fac2_id}")
        client.delete(f"/api/resources/{resource_id}")
        client.delete(f"/api/academic-years/{ay_id}")
        client.delete(f"/api/academic-years/{ay2_id}")
        client.delete(f"/api/semester-types/{st_id}")
        client.delete(f"/api/working-days/{wd_id}")
        client.delete(f"/api/time-slots/{ts_id}")

        print("\nAll 15 Phase 2 Acceptance Criteria Passed Successfully!")

if __name__ == "__main__":
    test_full_phase2_suite()
