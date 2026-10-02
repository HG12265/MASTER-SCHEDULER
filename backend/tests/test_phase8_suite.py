import sys
import io
import zipfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from starlette.testclient import TestClient
from pymongo import MongoClient
from app.main import app


def cleanup_test_records():
    client = MongoClient("mongodb://localhost:27017")
    db = client["master_scheduler"]

    # Clear Phase 8 collections
    db["faculty_leave_requests"].delete_many({})
    db["substitutions"].delete_many({})
    db["notifications"].delete_many({})
    db["academic_calendar_exceptions"].delete_many({})
    db["backup_history"].delete_many({})
    db["audit_logs"].delete_many({})

    # Clear test timetables and master data
    db["timetables"].delete_many({})
    db["timetable_entries"].delete_many({})
    db["academic_years"].delete_many({"name": {"$regex": "P8|Test", "$options": "i"}})
    db["semester_types"].delete_many({"code": {"$regex": "P8", "$options": "i"}})
    db["working_days"].delete_many({"name": "Monday"})
    db["time_slots"].delete_many({"name": "Period 1"})
    db["programmes"].delete_many({"code": {"$regex": "P8|MSC_CS", "$options": "i"}})
    db["semesters"].delete_many({"name": {"$regex": "P8", "$options": "i"}})
    db["classes"].delete_many({"name": {"$regex": "P8", "$options": "i"}})
    db["faculty"].delete_many({"facultyCode": {"$regex": "FAC_P8", "$options": "i"}})
    db["subjects"].delete_many({"subjectCode": {"$regex": "P8|CS801", "$options": "i"}})
    db["faculty_allocations"].delete_many({})
    db["faculty_subject_allocations"].delete_many({})

    # Retain seeded default admin if present, remove other test users
    db["users"].delete_many({"email": {"$ne": "admin@university.edu"}})

    client.close()


def test_full_phase8_suite():
    cleanup_test_records()
    try:
        with TestClient(app) as client:
            # ====================================================
            # 1. HEALTH PROBES
            # ====================================================
            res_live = client.get("/api/health/live")
            assert res_live.status_code == 200
            assert res_live.json()["status"] == "alive"

            res_ready = client.get("/api/health/ready")
            assert res_ready.status_code == 200
            assert res_ready.json()["status"] == "ready"

            # ====================================================
            # 2. AUTHENTICATION & RBAC
            # ====================================================
            # Login as default admin
            login_res = client.post("/api/auth/login", json={
                "email": "admin@university.edu",
                "password": "adminpassword"
            })
            assert login_res.status_code == 200
            auth_data = login_res.json()
            admin_token = auth_data["token"]
            assert admin_token is not None
            assert auth_data["user"]["role"] == "SUPER_ADMIN"

            headers = {"Authorization": f"Bearer {admin_token}"}

            # Auth Me
            me_res = client.get("/api/auth/me", headers=headers)
            assert me_res.status_code == 200
            assert me_res.json()["user"]["email"] == "admin@university.edu"

            # Create a test faculty user
            user_res = client.post("/api/users", headers=headers, json={
                "email": "faculty.test@university.edu",
                "username": "faculty_test",
                "password": "faculty_password123",
                "fullName": "Dr. Test Faculty",
                "role": "FACULTY",
                "department": "Computer Science"
            })
            assert user_res.status_code == 201
            faculty_user_id = user_res.json()["id"]

            # User list
            users_list_res = client.get("/api/users", headers=headers)
            assert users_list_res.status_code == 200
            assert len(users_list_res.json()) >= 2

            # ====================================================
            # 3. MASTER SETUP FOR TIMETABLE & OPERATIONS
            # ====================================================
            # Academic Year
            ay_res = client.post("/api/academic-years", headers=headers, json={
                "name": "2026-2027 P8 Ops",
                "startYear": 2026,
                "endYear": 2027,
                "isCurrent": True
            })
            assert ay_res.status_code == 201
            ay_id = ay_res.json()["data"]["id"]

            # Semester Type
            st_res = client.post("/api/semester-types", headers=headers, json={
                "name": "Odd Semester P8",
                "code": "ODD_P8",
                "description": "Odd Semester P8"
            })
            assert st_res.status_code == 201
            st_id = st_res.json()["data"]["id"]

            # Working Day (Monday)
            wd_res = client.post("/api/working-days", headers=headers, json={
                "name": "Monday",
                "shortName": "MON",
                "dayOrder": 1,
                "isWorkingDay": True
            })
            assert wd_res.status_code == 201
            wd_id = wd_res.json()["data"]["id"]

            # Time Slot (09:00 - 10:00)
            ts_res = client.post("/api/time-slots", headers=headers, json={
                "name": "Period 1",
                "startTime": "09:00",
                "endTime": "10:00",
                "slotOrder": 1,
                "slotType": "PERIOD",
                "isTeachingSlot": True
            })
            assert ts_res.status_code == 201
            ts_id = ts_res.json()["data"]["id"]

            # Programme & Semester
            prog_res = client.post("/api/programmes", headers=headers, json={
                "name": "Master of Computer Applications P8",
                "shortName": "MCA P8",
                "code": "MCA_P8",
                "durationYears": 2,
                "totalSemesters": 4
            })
            assert prog_res.status_code == 201
            prog_id = prog_res.json()["data"]["id"]

            sem_res = client.post("/api/semesters", headers=headers, json={
                "name": "Semester 1 P8",
                "displayName": "MCA Sem 1 P8",
                "semesterNumber": 1,
                "programmeId": prog_id
            })
            assert sem_res.status_code == 201
            sem_id = sem_res.json()["data"]["id"]

            # Class
            cls_res = client.post("/api/classes", headers=headers, json={
                "name": "MCA I P8",
                "displayName": "MCA Semester I P8",
                "programmeId": prog_id,
                "semesterId": sem_id,
                "academicYearId": ay_id,
                "semesterTypeId": st_id,
                "studentStrength": 35
            })
            assert cls_res.status_code == 201
            cls_id = cls_res.json()["data"]["id"]

            # Faculty (Primary and Candidate Substitute)
            fac1_res = client.post("/api/faculty", headers=headers, json={
                "name": "Dr. Primary Professor",
                "facultyCode": "FAC_P8_1",
                "email": "primary@university.edu",
                "department": "Computer Science",
                "designation": "Professor",
                "employmentType": "REGULAR",
                "maxWeeklyHours": 18
            })
            assert fac1_res.status_code == 201
            fac1_id = fac1_res.json()["data"]["id"]

            fac2_res = client.post("/api/faculty", headers=headers, json={
                "name": "Dr. Substitute Scholar",
                "facultyCode": "FAC_P8_2",
                "email": "substitute@university.edu",
                "department": "Computer Science",
                "designation": "Associate Professor",
                "employmentType": "REGULAR",
                "maxWeeklyHours": 18
            })
            assert fac2_res.status_code == 201
            fac2_id = fac2_res.json()["data"]["id"]

            # Subject
            sub_res = client.post("/api/subjects", headers=headers, json={
                "name": "Operating Systems P8",
                "subjectCode": "CS101_P8",
                "programmeId": prog_id,
                "semesterId": sem_id,
                "subjectType": "THEORY",
                "defaultWeeklyHours": 4
            })
            assert sub_res.status_code == 201
            sub_id = sub_res.json()["data"]["id"]

            # Insert published timetable and entry directly
            mongo_setup = MongoClient("mongodb://localhost:27017")
            test_db = mongo_setup["master_scheduler"]
            tt_doc = {
                "academicYearId": ay_id,
                "semesterTypeId": st_id,
                "name": "Official Production Timetable P8",
                "status": "PUBLISHED",
                "isPublished": True,
                "isActive": True,
                "fitnessScore": 99.5,
                "createdAt": "2026-10-01T00:00:00Z",
                "updatedAt": "2026-10-01T00:00:00Z"
            }
            tt_id = str(test_db["timetables"].insert_one(tt_doc).inserted_id)

            entry_doc = {
                "timetableId": tt_id,
                "classId": cls_id,
                "subjectId": sub_id,
                "facultyIds": [fac1_id],
                "workingDayId": wd_id,
                "timeSlotId": ts_id,
                "isLocked": True,
                "isActive": True,
                "createdAt": "2026-10-01T00:00:00Z",
                "updatedAt": "2026-10-01T00:00:00Z"
            }
            entry_id = str(test_db["timetable_entries"].insert_one(entry_doc).inserted_id)

            alloc_doc = {
                "academicYearId": ay_id,
                "semesterTypeId": st_id,
                "classId": cls_id,
                "subjectId": sub_id,
                "facultyIds": [fac2_id],
                "weeklyHours": 4,
                "isActive": True,
                "createdAt": "2026-10-01T00:00:00Z",
                "updatedAt": "2026-10-01T00:00:00Z"
            }
            test_db["faculty_allocations"].insert_one(alloc_doc)
            mongo_setup.close()

            # ====================================================
            # 4. ACADEMIC CALENDAR
            # ====================================================
            target_date = "2026-10-05"  # Suppose this is a Monday

            cal_res = client.post("/api/academic-calendar", headers=headers, json={
                "academicYearId": ay_id,
                "date": target_date,
                "type": "SPECIAL_WORKING_DAY",
                "title": "Special Monday Instruction",
                "isTeachingDay": True,
                "mappedWorkingDayId": wd_id
            })
            assert cal_res.status_code == 201

            # Date lookup
            lookup_res = client.get(f"/api/academic-calendar/date-lookup?date={target_date}", headers=headers)
            assert lookup_res.status_code == 200
            assert lookup_res.json()["isTeachingDay"] is True
            assert lookup_res.json()["isException"] is True

            # ====================================================
            # 5. FACULTY LEAVE & IMPACT ANALYSIS
            # ====================================================
            # Preview impact
            impact_res = client.post("/api/leave-requests/preview-impact", headers=headers, json={
                "facultyId": fac1_id,
                "leaveType": "CASUAL",
                "startDate": target_date,
                "endDate": target_date,
                "fullDay": True,
                "reason": "Family obligation"
            })
            assert impact_res.status_code == 200
            impact_data = impact_res.json()
            assert impact_data["totalAffectedPeriods"] >= 1

            # Submit and approve leave
            leave_create_res = client.post("/api/leave-requests", headers=headers, json={
                "facultyId": fac1_id,
                "leaveType": "CASUAL",
                "startDate": target_date,
                "endDate": target_date,
                "fullDay": True,
                "reason": "Family obligation"
            })
            assert leave_create_res.status_code == 201
            leave_id = leave_create_res.json()["id"]

            approve_res = client.post(f"/api/leave-requests/{leave_id}/approve", headers=headers, json={
                "reviewNotes": "Approved by HOD"
            })
            assert approve_res.status_code == 200
            assert approve_res.json()["status"] == "APPROVED"

            # ====================================================
            # 6. DAILY OPERATIONS & CANDIDATE RECOMMENDATION
            # ====================================================
            daily_res = client.get(f"/api/operations/daily-schedule?date={target_date}", headers=headers)
            assert daily_res.status_code == 200
            daily_data = daily_res.json()
            assert daily_data["scheduledClassesCount"] >= 1
            assert daily_data["unresolvedPeriodsCount"] >= 1

            # Candidate Recommendation Engine
            candidates_res = client.get(
                f"/api/substitutions/candidates?date={target_date}&entryId={entry_id}",
                headers=headers
            )
            assert candidates_res.status_code == 200
            cand_data = candidates_res.json()
            candidates = cand_data["candidates"]
            assert len(candidates) > 0
            # Dr. Substitute Scholar should have high match score due to subject allocation
            best_candidate = candidates[0]
            assert best_candidate["facultyId"] == fac2_id
            assert best_candidate["matchScore"] >= 50

            # Assign substitute
            sub_assign_res = client.post("/api/substitutions", headers=headers, json={
                "date": target_date,
                "originalEntryId": entry_id,
                "substituteFacultyId": fac2_id,
                "assignmentType": "SUBSTITUTION",
                "notes": "Covering theory lecture"
            })
            assert sub_assign_res.status_code == 201
            sub_id_created = sub_assign_res.json()["id"]

            # Re-fetch daily schedule: should now be SUBSTITUTED
            daily_res_after = client.get(f"/api/operations/daily-schedule?date={target_date}", headers=headers)
            assert daily_res_after.status_code == 200
            daily_after = daily_res_after.json()
            assert daily_after["substitutionsCount"] >= 1
            assert daily_after["unresolvedPeriodsCount"] == 0
            session = daily_after["sessions"][0]
            assert session["sessionStatus"] == "SUBSTITUTED"
            assert session["effectiveFacultyName"] == "Dr. Substitute Scholar"

            # ====================================================
            # 7. NOTIFICATIONS & AUDIT LOGS
            # ====================================================
            notif_res = client.get("/api/notifications", headers=headers)
            assert notif_res.status_code == 200
            notifs = notif_res.json()
            assert len(notifs) >= 1

            unread_res = client.get("/api/notifications/unread-count", headers=headers)
            assert unread_res.status_code == 200
            assert unread_res.json()["unreadCount"] >= 1

            audit_res = client.get("/api/audit-logs", headers=headers)
            assert audit_res.status_code == 200
            audit_logs = audit_res.json()
            assert len(audit_logs) >= 1

            # ====================================================
            # 8. SYSTEM SETTINGS & DATABASE INTEGRITY
            # ====================================================
            settings_res = client.get("/api/system/settings", headers=headers)
            assert settings_res.status_code == 200

            update_settings_res = client.put("/api/system/settings", headers=headers, json={
                "defaultTimezone": "Asia/Kolkata",
                "dateFormat": "YYYY-MM-DD",
                "timeFormat": "24h",
                "substitutionPolicies": {
                    "prioritizeSameSubject": True,
                    "requireApprovalForLeave": True,
                    "allowOvertimeSubstitutes": False,
                    "autoNotifySubstitutes": True
                }
            })
            assert update_settings_res.status_code == 200

            # Referential integrity check
            integrity_res = client.post("/api/system/integrity-check", headers=headers)
            assert integrity_res.status_code == 200
            integrity_data = integrity_res.json()
            assert "passed" in integrity_data
            assert "issues" in integrity_data

            # ====================================================
            # 9. BACKUP EXPORT & SAFE VALIDATE/RESTORE PREVIEW
            # ====================================================
            export_res = client.post("/api/system/backups/export", headers=headers)
            assert export_res.status_code == 200
            zip_bytes = export_res.content

            # Verify it's a valid zip containing manifest.json
            with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
                names = z.namelist()
                assert "manifest.json" in names
                assert "academic_years.json" in names
                assert "timetables.json" in names

            # Validate backup via endpoint
            files = {"file": ("test_backup.zip", io.BytesIO(zip_bytes), "application/zip")}
            validate_res = client.post("/api/system/backups/validate", headers=headers, files=files)
            assert validate_res.status_code == 200
            assert validate_res.json()["isValid"] is True

            # Preview restore
            files = {"file": ("test_backup.zip", io.BytesIO(zip_bytes), "application/zip")}
            preview_res = client.post("/api/system/backups/preview", headers=headers, files=files)
            assert preview_res.status_code == 200
            assert preview_res.json()["canRestore"] is True

            # Backup history
            history_res = client.get("/api/system/backups/history", headers=headers)
            assert history_res.status_code == 200
            assert len(history_res.json()) >= 1

            # ====================================================
            # 10. OPERATIONAL REPORTS
            # ====================================================
            sub_rep_res = client.get(f"/api/reports/substitutions?startDate={target_date}&endDate={target_date}", headers=headers)
            assert sub_rep_res.status_code == 200
            sub_rep = sub_rep_res.json()["data"]
            assert sub_rep["totalSubstitutions"] >= 1
            assert sub_rep["assignedCount"] >= 1

            workload_rep_res = client.get(f"/api/reports/operational-workload?startDate={target_date}&endDate={target_date}", headers=headers)
            assert workload_rep_res.status_code == 200
            workload_rep = workload_rep_res.json()["data"]
            assert workload_rep["totalFaculty"] >= 1

            print("\n[SUCCESS] Full Phase 8 Test Suite passed completely with 100% assertions verified!")

    finally:
        cleanup_test_records()


if __name__ == "__main__":
    test_full_phase8_suite()
