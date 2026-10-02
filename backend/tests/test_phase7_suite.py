import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from starlette.testclient import TestClient
from pymongo import MongoClient
from app.main import app


def cleanup_test_records():
    client = MongoClient("mongodb://localhost:27017")
    db = client["master_scheduler"]
    test_filter = {"$regex": "test|p7|p6|p5|msc|mca", "$options": "i"}

    db["timetables"].delete_many({})
    db["timetable_entries"].delete_many({})
    db["timetable_change_history"].delete_many({})
    db["export_history"].delete_many({})
    db["institution_settings"].delete_many({})

    db["faculty_availability"].delete_many({})
    db["fixed_timetable_slots"].delete_many({})
    db["scheduling_settings"].delete_many({})
    db["class_constraints"].delete_many({})
    db["faculty_constraints"].delete_many({})
    db["subject_constraints"].delete_many({})

    db["faculty_allocations"].delete_many({})
    db["classes"].delete_many({"name": test_filter})
    db["subjects"].delete_many({"$or": [{"name": test_filter}, {"subjectCode": test_filter}, {"subjectCode": "ADV_AI_CLOUD_999"}]})
    db["semesters"].delete_many({"$or": [{"name": test_filter}, {"displayName": test_filter}]})
    db["programmes"].delete_many({"code": test_filter})
    db["faculty"].delete_many({"facultyCode": test_filter})
    db["resources"].delete_many({"code": test_filter})
    db["time_slots"].delete_many({"name": test_filter})
    db["working_days"].delete_many({"name": test_filter})
    db["semester_types"].delete_many({"code": test_filter})
    db["academic_years"].delete_many({"name": test_filter})
    client.close()


def test_full_phase7_suite():
    cleanup_test_records()
    try:
        with TestClient(app) as client:
            # ====================================================
            # 1. SETUP MASTER ACADEMIC STRUCTURE
            # ====================================================
            ay_res = client.post("/api/academic-years", json={
                "name": "2026-2027 P7 Test",
                "startYear": 2026,
                "endYear": 2027,
                "isCurrent": True
            })
            assert ay_res.status_code == 201
            ay_id = ay_res.json()["data"]["id"]

            st_res = client.post("/api/semester-types", json={
                "name": "Odd Semester P7",
                "code": "ODD_P7",
                "description": "Odd term for Phase 7 publish & export tests"
            })
            assert st_res.status_code == 201
            st_id = st_res.json()["data"]["id"]

            # Working Days: Mon, Tue, Wed
            days = []
            for name, short, order in [("Monday P7", "MON_P7", 1), ("Tuesday P7", "TUE_P7", 2), ("Wednesday P7", "WED_P7", 3)]:
                d_res = client.post("/api/working-days", json={
                    "name": name,
                    "shortName": short,
                    "dayOrder": order,
                    "isWorkingDay": True
                })
                assert d_res.status_code == 201
                days.append(d_res.json()["data"])
            mon_id, tue_id, wed_id = [d["id"] for d in days]

            # Time slots (including non-teaching Lunch)
            slots = []
            slot_defs = [
                ("P1 P7", "09:30", "10:30", 1, True, "THEORY"),
                ("P2 P7", "10:30", "11:30", 2, True, "THEORY"),
                ("P3 P7", "11:30", "12:30", 3, True, "THEORY"),
                ("Lunch P7", "12:30", "13:30", 4, False, "LUNCH"),
                ("P4 P7", "13:30", "14:30", 5, True, "THEORY"),
                ("P5 P7", "14:30", "15:30", 6, True, "THEORY"),
            ]
            for name, st, et, order, is_teach, stype in slot_defs:
                ts_res = client.post("/api/time-slots", json={
                    "name": name,
                    "startTime": st,
                    "endTime": et,
                    "slotOrder": order,
                    "isTeachingSlot": is_teach,
                    "slotType": stype
                })
                assert ts_res.status_code == 201
                slots.append(ts_res.json()["data"])
            p1_id, p2_id, p3_id, lunch_id, p4_id, p5_id = [s["id"] for s in slots]

            # Programme & Semester
            prog_res = client.post("/api/programmes", json={
                "name": "Master of Computer Applications P7",
                "shortName": "MCA P7",
                "code": "MCA_P7",
                "durationYears": 2,
                "totalSemesters": 4
            })
            assert prog_res.status_code == 201
            prog_id = prog_res.json()["data"]["id"]

            sem_res = client.post("/api/semesters", json={
                "name": "Semester 1 P7",
                "displayName": "MCA Sem 1 P7",
                "semesterNumber": 1,
                "programmeId": prog_id
            })
            assert sem_res.status_code == 201
            sem_id = sem_res.json()["data"]["id"]

            # Class
            cls_res = client.post("/api/classes", json={
                "name": "MCA I P7",
                "displayName": "MCA Semester I P7",
                "programmeId": prog_id,
                "semesterId": sem_id,
                "academicYearId": ay_id,
                "semesterTypeId": st_id,
                "studentStrength": 35
            })
            assert cls_res.status_code == 201
            cls_id = cls_res.json()["data"]["id"]

            # Faculty
            fac1_res = client.post("/api/faculty", json={
                "name": "Dr. Alan Turing P7",
                "facultyCode": "TUR_P7",
                "email": "turing.p7@test.edu",
                "designation": "Professor",
                "department": "Computer Science",
                "maxWeeklyHours": 16
            })
            assert fac1_res.status_code == 201
            fac1_id = fac1_res.json()["data"]["id"]

            fac2_res = client.post("/api/faculty", json={
                "name": "Dr. Ada Lovelace P7",
                "facultyCode": "ADA_P7",
                "email": "lovelace.p7@test.edu",
                "designation": "Associate Professor",
                "department": "Computer Science",
                "maxWeeklyHours": 16
            })
            assert fac2_res.status_code == 201
            fac2_id = fac2_res.json()["data"]["id"]

            # Resources (1 Lab, 1 Classroom)
            res_lab = client.post("/api/resources", json={
                "name": "Systems Lab P7",
                "code": "LAB_P7",
                "resourceType": "LAB",
                "capacity": 40
            })
            assert res_lab.status_code == 201
            lab_res_id = res_lab.json()["data"]["id"]

            res_room = client.post("/api/resources", json={
                "name": "Lecture Hall 101 P7",
                "code": "LH101_P7",
                "resourceType": "CLASSROOM",
                "capacity": 60
            })
            assert res_room.status_code == 201
            room_res_id = res_room.json()["data"]["id"]

            # Subjects (2 Theory, 1 Lab)
            sub1_res = client.post("/api/subjects", json={
                "name": "Operating Systems P7",
                "subjectCode": "CS101_P7",
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
                "name": "Data Structures P7",
                "subjectCode": "CS102_P7",
                "programmeId": prog_id,
                "semesterId": sem_id,
                "subjectType": "THEORY",
                "defaultWeeklyHours": 3,
                "defaultBlockSize": 1,
                "requiresConsecutivePeriods": False
            })
            assert sub2_res.status_code == 201
            sub2_id = sub2_res.json()["data"]["id"]

            sub3_res = client.post("/api/subjects", json={
                "name": "OS & DS Practical P7",
                "subjectCode": "CS103L_P7",
                "programmeId": prog_id,
                "semesterId": sem_id,
                "subjectType": "LAB",
                "defaultWeeklyHours": 2,
                "defaultBlockSize": 2,
                "requiresConsecutivePeriods": True
            })
            assert sub3_res.status_code == 201
            sub3_id = sub3_res.json()["data"]["id"]

            # Faculty Allocations
            client.post("/api/faculty-allocations", json={
                "academicYearId": ay_id,
                "semesterTypeId": st_id,
                "classId": cls_id,
                "subjectId": sub1_id,
                "facultyIds": [fac1_id],
                "weeklyHours": 3
            })
            client.post("/api/faculty-allocations", json={
                "academicYearId": ay_id,
                "semesterTypeId": st_id,
                "classId": cls_id,
                "subjectId": sub2_id,
                "facultyIds": [fac2_id],
                "weeklyHours": 3
            })
            client.post("/api/faculty-allocations", json={
                "academicYearId": ay_id,
                "semesterTypeId": st_id,
                "classId": cls_id,
                "subjectId": sub3_id,
                "facultyIds": [fac1_id, fac2_id],
                "weeklyHours": 2,
                "preferredResourceId": lab_res_id
            })

            # ====================================================
            # GENERATE INITIAL VALID TIMETABLE VIA CP-SAT
            # ====================================================
            gen_res = client.post("/api/scheduler/generate", json={
                "academicYearId": ay_id,
                "semesterTypeId": st_id,
                "solverOptions": {"maxSolveSeconds": 15, "numWorkers": 4}
            })
            assert gen_res.status_code == 200, f"Generation failed: {gen_res.text}"
            tt_data = gen_res.json()["data"]
            tt_id = tt_data["id"]
            assert tt_data["status"] == "DRAFT"
            assert tt_data["validationStatus"] == "VALID"

            # ====================================================
            # TEST 17: INSTITUTION SETTINGS (GET & PUT)
            # ====================================================
            inst_get = client.get("/api/institution-settings")
            assert inst_get.status_code == 200
            orig_settings = inst_get.json()["data"]

            inst_put = client.put("/api/institution-settings", json={
                "institutionName": "Salem University P7",
                "departmentName": "School of Computing P7",
                "principalName": "Dr. Director P7",
                "hodName": "Dr. Head P7"
            })
            assert inst_put.status_code == 200
            assert inst_put.json()["data"]["institutionName"] == "Salem University P7"

            # ====================================================
            # TEST 1: INVALID TIMETABLE SUBMISSION (Rejected)
            # Delete one generated entry to create a curriculum shortage
            # ====================================================
            entries = client.get(f"/api/timetables/{tt_id}/entries").json()["data"]
            os_entries = [e for e in entries if e.get("subjectId") == sub1_id]
            assert len(os_entries) == 3

            cur_rev = client.get(f"/api/timetables/{tt_id}").json()["data"]["revision"]
            del_res = client.delete(f"/api/timetables/{tt_id}/entries/{os_entries[0]['id']}?expectedRevision={cur_rev}")
            assert del_res.status_code == 200
            cur_rev = del_res.json()["data"]["newRevision"]

            # Submission should be rejected because timetable has a shortage
            sub_res_bad = client.post(f"/api/timetables/{tt_id}/submit-for-approval")
            assert sub_res_bad.status_code == 400
            assert "validation error" in sub_res_bad.text.lower() or "conflict" in sub_res_bad.text.lower()

            # Restore the deleted entry using manual add
            occupied_slots = {(e["workingDayId"], e["timeSlotId"]) for e in client.get(f"/api/timetables/{tt_id}/entries").json()["data"]}
            free_slot = None
            for d in [mon_id, tue_id, wed_id]:
                for s in [p1_id, p2_id, p3_id, p4_id, p5_id]:
                    if (d, s) not in occupied_slots:
                        free_slot = (d, s)
                        break
                if free_slot:
                    break

            restore_res = client.post(f"/api/timetables/{tt_id}/entries", json={
                "classId": cls_id,
                "workingDayId": free_slot[0],
                "timeSlotId": free_slot[1],
                "entryType": "SUBJECT",
                "subjectId": sub1_id,
                "facultyIds": [fac1_id],
                "expectedRevision": cur_rev
            })
            assert restore_res.status_code == 201
            cur_rev = restore_res.json()["data"]["newRevision"]

            # Validate timetable is clean again
            val_check = client.post(f"/api/timetables/{tt_id}/validate")
            assert val_check.status_code == 200
            assert val_check.json()["data"]["status"] == "VALID"

            # ====================================================
            # TEST 2: VALID SUBMISSION (READY_FOR_APPROVAL)
            # ====================================================
            sub_res = client.post(f"/api/timetables/{tt_id}/submit-for-approval")
            assert sub_res.status_code == 200
            sub_data = sub_res.json()["data"]
            assert sub_data["status"] == "READY_FOR_APPROVAL"

            # Test Return to Draft works
            ret_res = client.post(f"/api/timetables/{tt_id}/return-to-draft")
            assert ret_res.status_code == 200
            assert ret_res.json()["data"]["status"] == "DRAFT"

            # Re-submit for approval
            client.post(f"/api/timetables/{tt_id}/submit-for-approval")

            # ====================================================
            # TEST 3: PUBLISH TIMETABLE
            # ====================================================
            pub_res = client.post(f"/api/timetables/{tt_id}/publish")
            assert pub_res.status_code == 200
            pub_data = pub_res.json()["data"]
            assert pub_data["status"] == "PUBLISHED"
            assert pub_data["publishedAt"] is not None
            assert pub_data["publishedBy"] is not None

            # ====================================================
            # TEST 5: PUBLISHED IMMUTABILITY & EDIT BLOCK
            # Any move or edit on PUBLISHED timetable must be rejected
            # ====================================================
            test_entry = client.get(f"/api/timetables/{tt_id}/entries").json()["data"][0]
            move_attempt = client.post(f"/api/timetables/{tt_id}/edit/preview-move", json={
                "entryId": test_entry["id"],
                "targetWorkingDayId": wed_id,
                "targetTimeSlotId": p5_id
            })
            assert move_attempt.status_code == 409
            assert "published or archived" in move_attempt.text.lower()

            del_attempt = client.delete(f"/api/timetables/{tt_id}/entries/{test_entry['id']}?expectedRevision=1")
            assert del_attempt.status_code == 409

            # Cannot delete published timetable
            del_tt_attempt = client.delete(f"/api/timetables/{tt_id}")
            assert del_tt_attempt.status_code == 409

            # ====================================================
            # TEST 6: CREATE DRAFT COPY FROM PUBLISHED
            # ====================================================
            draft_copy_res = client.post(f"/api/timetables/{tt_id}/create-draft-copy")
            assert draft_copy_res.status_code == 201
            copy_data = draft_copy_res.json()["data"]
            assert copy_data["status"] == "DRAFT"
            assert copy_data["version"] > pub_data["version"]
            assert copy_data["id"] != tt_id

            # Verify original published timetable remained unchanged
            orig_check = client.get(f"/api/timetables/{tt_id}").json()["data"]
            assert orig_check["status"] == "PUBLISHED"

            # ====================================================
            # TEST 7: ARCHIVE
            # ====================================================
            arch_res = client.post(f"/api/timetables/{tt_id}/archive")
            assert arch_res.status_code == 200
            assert arch_res.json()["data"]["status"] == "ARCHIVED"

            # Archived timetable cannot be edited or deleted
            arch_del_attempt = client.delete(f"/api/timetables/{tt_id}")
            assert arch_del_attempt.status_code == 409

            # Re-publish the cloned draft to test exports on a published timetable
            new_draft_id = copy_data["id"]
            client.post(f"/api/timetables/{new_draft_id}/submit-for-approval")
            client.post(f"/api/timetables/{new_draft_id}/publish")
            active_pub_id = new_draft_id

            # ====================================================
            # TEST 8: CLASS TIMETABLE PDF EXPORT
            # ====================================================
            pdf_class = client.get(f"/api/timetables/{active_pub_id}/export/pdf?view=class&classId={cls_id}")
            assert pdf_class.status_code == 200
            assert pdf_class.headers["content-type"] == "application/pdf"
            assert len(pdf_class.content) > 1000  # Valid non-empty PDF
            assert b"%PDF" in pdf_class.content[:10]

            # ====================================================
            # TEST 9: FACULTY TIMETABLE PDF EXPORT
            # ====================================================
            pdf_fac = client.get(f"/api/timetables/{active_pub_id}/export/pdf?view=faculty&facultyId={fac1_id}")
            assert pdf_fac.status_code == 200
            assert pdf_fac.headers["content-type"] == "application/pdf"
            assert len(pdf_fac.content) > 1000
            assert b"%PDF" in pdf_fac.content[:10]

            # ====================================================
            # TEST 10: MASTER TIMETABLE PDF EXPORT
            # ====================================================
            pdf_master = client.get(f"/api/timetables/{active_pub_id}/export/pdf?view=master")
            assert pdf_master.status_code == 200
            assert pdf_master.headers["content-type"] == "application/pdf"
            assert len(pdf_master.content) > 1000

            # ====================================================
            # TEST 11: CLASS TIMETABLE EXCEL EXPORT
            # ====================================================
            excel_class = client.get(f"/api/timetables/{active_pub_id}/export/excel?view=class&classId={cls_id}")
            assert excel_class.status_code == 200
            assert "spreadsheetml" in excel_class.headers["content-type"]
            assert len(excel_class.content) > 500

            # ====================================================
            # TEST 12: MASTER WORKBOOK EXCEL EXPORT
            # ====================================================
            excel_master = client.get(f"/api/timetables/{active_pub_id}/export/excel?view=master")
            assert excel_master.status_code == 200
            assert len(excel_master.content) > 1000

            # Check export audit history logged both PDF and EXCEL
            hist_res = client.get(f"/api/timetables/{active_pub_id}/export-history")
            assert hist_res.status_code == 200
            history_items = hist_res.json()["data"]
            assert len(history_items) >= 4

            # ====================================================
            # TEST 13: FACULTY WORKLOAD REPORT
            # ====================================================
            wl_res = client.get(f"/api/reports/faculty-workload?timetableId={active_pub_id}")
            assert wl_res.status_code == 200
            wl_data = wl_res.json()["data"]
            assert wl_data["totalFaculty"] >= 2
            turing_wl = [item for item in wl_data["items"] if item["facultyId"] == fac1_id][0]
            assert turing_wl["scheduledHours"] >= 3  # 3 hours theory + lab
            assert turing_wl["utilizationPercent"] > 0

            # Test report excel download
            wl_excel = client.get(f"/api/reports/faculty-workload/export/excel?timetableId={active_pub_id}")
            assert wl_excel.status_code == 200
            assert len(wl_excel.content) > 500

            # ====================================================
            # TEST 14: SUBJECT COVERAGE REPORT
            # All subjects should be COMPLETE in a valid published timetable
            # ====================================================
            cov_res = client.get(f"/api/reports/subject-coverage?timetableId={active_pub_id}")
            assert cov_res.status_code == 200
            cov_data = cov_res.json()["data"]
            assert cov_data["totalSubjects"] >= 3
            assert cov_data["shortageCount"] == 0
            assert all(item["coverageStatus"] == "COMPLETE" for item in cov_data["items"])

            cov_excel = client.get(f"/api/reports/subject-coverage/export/excel?timetableId={active_pub_id}")
            assert cov_excel.status_code == 200
            assert len(cov_excel.content) > 500

            # ====================================================
            # TEST 15: RESOURCE UTILIZATION REPORT
            # ====================================================
            res_util = client.get(f"/api/reports/resource-utilization?timetableId={active_pub_id}")
            assert res_util.status_code == 200
            util_data = res_util.json()["data"]
            assert util_data["totalResources"] >= 2
            lab_item = [r for r in util_data["items"] if r["resourceId"] == lab_res_id][0]
            assert lab_item["usedSlots"] == 2  # 2-period lab assigned
            assert lab_item["utilizationPercent"] > 0

            res_excel = client.get(f"/api/reports/resource-utilization/export/excel?timetableId={active_pub_id}")
            assert res_excel.status_code == 200
            assert len(res_excel.content) > 500

            # Class Load Report
            class_load_res = client.get(f"/api/reports/class-load?timetableId={active_pub_id}")
            assert class_load_res.status_code == 200
            assert len(class_load_res.json()["data"]["items"]) >= 1

            # ====================================================
            # TEST 16: DASHBOARD ANALYTICS WITH REAL DATA
            # ====================================================
            dash_res = client.get("/api/dashboard/summary")
            assert dash_res.status_code == 200
            dash_data = dash_res.json()["data"]
            assert dash_data["classes"] >= 1
            assert dash_data["faculty"] >= 2
            assert dash_data["publishedTimetablesCount"] >= 1
            assert dash_data["latestTimetable"] is not None
            assert len(dash_data["facultyWorkloadChart"]) >= 2

            # ====================================================
            # TEST 18, 19, 20: LONG NAMES & IMMUTABILITY SAFETY
            # ====================================================
            long_sub = client.post("/api/subjects", json={
                "name": "Advanced Topics in Cloud Distributed Computing and Artificial Intelligence Architecture",
                "subjectCode": "ADV_AI_P7",
                "programmeId": prog_id,
                "semesterId": sem_id,
                "subjectType": "THEORY",
                "defaultWeeklyHours": 2
            })
            assert long_sub.status_code == 201

            # Verify published timetable remains unchanged and exportable
            pdf_final = client.get(f"/api/timetables/{active_pub_id}/export/pdf?view=master")
            assert pdf_final.status_code == 200
            assert len(pdf_final.content) > 1000

    finally:
        cleanup_test_records()
