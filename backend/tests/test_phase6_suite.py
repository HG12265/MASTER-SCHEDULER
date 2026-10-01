import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from starlette.testclient import TestClient
from pymongo import MongoClient
from bson import ObjectId
from app.main import app

def cleanup_test_records():
    client = MongoClient("mongodb://localhost:27017")
    db = client["master_scheduler"]
    test_filter = {"$regex": "test|p6|msc|mca", "$options": "i"}

    # Collections to clean
    db["timetables"].delete_many({})
    db["timetable_entries"].delete_many({})
    db["timetable_change_history"].delete_many({})

    db["faculty_availability"].delete_many({})
    db["fixed_timetable_slots"].delete_many({})
    db["scheduling_settings"].delete_many({})
    db["class_constraints"].delete_many({})
    db["faculty_constraints"].delete_many({})
    db["subject_constraints"].delete_many({})

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


def test_full_phase6_suite():
    cleanup_test_records()
    with TestClient(app) as client:
        # ====================================================
        # 1. SETUP MASTER DATA
        # ====================================================
        ay_res = client.post("/api/academic-years", json={
            "name": "2026-2027 P6 Test",
            "startYear": 2026,
            "endYear": 2027,
            "isCurrent": True
        })
        assert ay_res.status_code == 201
        ay_id = ay_res.json()["data"]["id"]

        st_res = client.post("/api/semester-types", json={
            "name": "Odd Semester P6",
            "code": "ODD_P6",
            "description": "Odd term for Phase 6 edit tests"
        })
        assert st_res.status_code == 201
        st_id = st_res.json()["data"]["id"]

        # Days: Mon, Tue, Wed
        days = []
        for name, short, order in [("Monday P6", "MON_P6", 1), ("Tuesday P6", "TUE_P6", 2), ("Wednesday P6", "WED_P6", 3)]:
            d_res = client.post("/api/working-days", json={
                "name": name,
                "shortName": short,
                "dayOrder": order,
                "isWorkingDay": True
            })
            assert d_res.status_code == 201
            days.append(d_res.json()["data"])
        mon_id, tue_id, wed_id = [d["id"] for d in days]

        # Time Slots: P1 (09-10), P2 (10-11), P3 (11-12), Lunch (12-13, Non-teaching), P4 (13-14), P5 (14-15)
        slots = []
        slot_defs = [
            ("P1 P6", "09:00", "10:00", 1, True, "PERIOD"),
            ("P2 P6", "10:00", "11:00", 2, True, "PERIOD"),
            ("P3 P6", "11:00", "12:00", 3, True, "PERIOD"),
            ("Lunch P6", "12:00", "13:00", 4, False, "LUNCH"),
            ("P4 P6", "13:00", "14:00", 5, True, "PERIOD"),
            ("P5 P6", "14:00", "15:00", 6, True, "PERIOD"),
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
            slots.append(s_res.json()["data"])
        p1_id, p2_id, p3_id, lunch_id, p4_id, p5_id = [s["id"] for s in slots]

        # Programme & Semester
        prog_res = client.post("/api/programmes", json={
            "name": "Computer Applications P6",
            "code": "MCA_P6",
            "shortName": "MCA-P6",
            "totalSemesters": 4
        })
        assert prog_res.status_code == 201
        prog_id = prog_res.json()["data"]["id"]

        sem_res = client.post("/api/semesters", json={
            "name": "Semester 1 P6",
            "displayName": "MCA Sem 1 P6",
            "semesterNumber": 1,
            "programmeId": prog_id
        })
        assert sem_res.status_code == 201
        sem_id = sem_res.json()["data"]["id"]

        # 2 Classes: Class A & Class B
        cls_a_res = client.post("/api/classes", json={
            "name": "MCA Class A P6",
            "displayName": "MCA-A P6",
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
            "name": "MCA Class B P6",
            "displayName": "MCA-B P6",
            "programmeId": prog_id,
            "semesterId": sem_id,
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "section": "B",
            "studentStrength": 50
        })
        assert cls_b_res.status_code == 201
        cls_b_id = cls_b_res.json()["data"]["id"]

        # Faculty Members
        fac1_res = client.post("/api/faculty", json={
            "facultyCode": "FAC_TURING_P6",
            "name": "Dr. Alan Turing P6",
            "designation": "Professor",
            "email": "turing.p6@university.edu",
            "maxHoursPerWeek": 16,
            "maxHoursPerDay": 4,
            "maxConsecutiveHours": 2
        })
        assert fac1_res.status_code == 201
        fac1_id = fac1_res.json()["data"]["id"]

        fac2_res = client.post("/api/faculty", json={
            "facultyCode": "FAC_ADA_P6",
            "name": "Dr. Ada Lovelace P6",
            "designation": "Professor",
            "email": "ada.p6@university.edu",
            "maxHoursPerWeek": 16,
            "maxHoursPerDay": 4,
            "maxConsecutiveHours": 2
        })
        assert fac2_res.status_code == 201
        fac2_id = fac2_res.json()["data"]["id"]

        fac3_res = client.post("/api/faculty", json={
            "facultyCode": "FAC_HOPPER_P6",
            "name": "Dr. Grace Hopper P6",
            "designation": "Associate Professor",
            "email": "hopper.p6@university.edu",
            "maxHoursPerWeek": 16,
            "maxHoursPerDay": 4,
            "maxConsecutiveHours": 2
        })
        assert fac3_res.status_code == 201
        fac3_id = fac3_res.json()["data"]["id"]

        # Resource: Systems Lab
        res1_res = client.post("/api/resources", json={
            "name": "Advanced Computing Lab P6",
            "code": "LAB_ADV_P6",
            "resourceType": "LAB",
            "capacity": 50
        })
        assert res1_res.status_code == 201
        res1_id = res1_res.json()["data"]["id"]

        # Subjects
        sub1_res = client.post("/api/subjects", json={
            "name": "Operating Systems P6",
            "subjectCode": "CS201_P6",
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
            "name": "Data Structures P6",
            "subjectCode": "CS202_P6",
            "programmeId": prog_id,
            "semesterId": sem_id,
            "subjectType": "THEORY",
            "defaultWeeklyHours": 2,
            "defaultBlockSize": 1,
            "requiresConsecutivePeriods": False
        })
        assert sub2_res.status_code == 201
        sub2_id = sub2_res.json()["data"]["id"]

        sub3_res = client.post("/api/subjects", json={
            "name": "Systems Programming Lab P6",
            "subjectCode": "CS203_P6",
            "programmeId": prog_id,
            "semesterId": sem_id,
            "subjectType": "LAB",
            "defaultWeeklyHours": 2,
            "defaultBlockSize": 2,
            "requiresConsecutivePeriods": True
        })
        assert sub3_res.status_code == 201
        sub3_id = sub3_res.json()["data"]["id"]

        # Allocations for Class A (OS: 3h, DS: 2h, Lab: 2h block)
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

        # Allocations for Class B (OS: 2h with Dr. Turing, DS: 2h with Dr. Hopper)
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

        # ====================================================
        # 2. GENERATE AUTOMATIC TIMETABLE (PHASE 5 ENGINE)
        # ====================================================
        gen_res = client.post("/api/scheduler/generate", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "solverOptions": {"maxSolveSeconds": 15, "numWorkers": 2}
        })
        assert gen_res.status_code == 200, f"Generation failed: {gen_res.text}"
        tt_id = gen_res.json()["data"]["id"]

        get_tt = client.get(f"/api/timetables/{tt_id}").json()["data"]
        assert get_tt["status"] == "DRAFT"
        assert get_tt.get("revision", 1) == 1
        assert get_tt.get("validationStatus") == "VALID"

        entries = client.get(f"/api/timetables/{tt_id}/entries").json()["data"]
        assert len(entries) >= 11  # 7 for Class A + 4 for Class B

        class_a_entries = [e for e in entries if e["classId"] == cls_a_id]
        os_entries = [e for e in class_a_entries if e["subjectId"] == sub1_id]
        ds_entries = [e for e in class_a_entries if e["subjectId"] == sub2_id]
        lab_entries = [e for e in class_a_entries if e["subjectId"] == sub3_id]
        assert len(os_entries) == 3
        assert len(ds_entries) == 2
        assert len(lab_entries) == 2

        # Verify blockId and blockSize on lab
        lab_block_id = lab_entries[0]["blockId"]
        assert lab_block_id is not None
        assert all(e["blockId"] == lab_block_id for e in lab_entries)
        assert all(e["blockSize"] == 2 for e in lab_entries)

        teaching_slots = [p1_id, p2_id, p3_id, p4_id, p5_id]

        # ====================================================
        # TEST 1: VALID MOVE
        # ====================================================
        target_entry = os_entries[0]
        # Find a slot that is free for Class A AND free for target entry's faculty
        cls_a_occupied_keys = {(e["workingDayId"], e["timeSlotId"]) for e in entries if e["classId"] == cls_a_id}
        target_fac_ids = set(target_entry.get("facultyIds", []))
        fac_occupied_keys = {(e["workingDayId"], e["timeSlotId"]) for e in entries if any(fid in target_fac_ids for fid in e.get("facultyIds", []))}
        all_busy = cls_a_occupied_keys.union(fac_occupied_keys)

        free_slot = None
        for d in [mon_id, tue_id, wed_id]:
            for s in teaching_slots:
                if (d, s) not in all_busy:
                    free_slot = (d, s)
                    break
            if free_slot:
                break
        assert free_slot is not None, "Need at least one free slot for Class A and Faculty"

        prev_res = client.post(f"/api/timetables/{tt_id}/edit/preview-move", json={
            "entryId": target_entry["id"],
            "targetWorkingDayId": free_slot[0],
            "targetTimeSlotId": free_slot[1]
        })
        assert prev_res.status_code == 200
        prev_data = prev_res.json()["data"]
        assert prev_data["valid"] is True, f"Move preview error: {prev_data}"

        move_res = client.patch(f"/api/timetables/{tt_id}/entries/{target_entry['id']}/move", json={
            "targetWorkingDayId": free_slot[0],
            "targetTimeSlotId": free_slot[1],
            "expectedRevision": 1
        })
        assert move_res.status_code == 200
        assert move_res.json()["data"]["newRevision"] == 2

        # Check history
        hist_res = client.get(f"/api/timetables/{tt_id}/history")
        assert hist_res.status_code == 200
        history = hist_res.json()["data"]
        assert len(history) == 1
        assert history[0]["changeType"] == "MOVE"

        # ====================================================
        # TEST 2: CLASS CONFLICT
        # Move into occupied class slot
        # ====================================================
        another_entry = ds_entries[0]
        clash_prev = client.post(f"/api/timetables/{tt_id}/edit/preview-move", json={
            "entryId": another_entry["id"],
            "targetWorkingDayId": free_slot[0],  # Now occupied by target_entry!
            "targetTimeSlotId": free_slot[1]
        })
        assert clash_prev.status_code == 200
        assert clash_prev.json()["data"]["valid"] is False
        assert any(c["type"] == "CLASS_CONFLICT" for c in clash_prev.json()["data"]["conflicts"])

        # ====================================================
        # TEST 3: FACULTY CONFLICT
        # Move to slot where faculty teaches another class
        # Dr. Turing (fac1_id) teaches Class B as well!
        # Find where Dr. Turing teaches Class B
        # ====================================================
        class_b_turing_entries = [e for e in entries if e["classId"] == cls_b_id and fac1_id in e.get("facultyIds", [])]
        assert len(class_b_turing_entries) > 0
        b_entry = class_b_turing_entries[0]

        # Attempt to move target_entry (which is taught by Dr. Turing) to b_entry's slot
        fac_conflict_res = client.post(f"/api/timetables/{tt_id}/edit/preview-move", json={
            "entryId": target_entry["id"],
            "targetWorkingDayId": b_entry["workingDayId"],
            "targetTimeSlotId": b_entry["timeSlotId"]
        })
        assert fac_conflict_res.status_code == 200
        assert fac_conflict_res.json()["data"]["valid"] is False
        assert any(c["type"] == "FACULTY_CONFLICT" for c in fac_conflict_res.json()["data"]["conflicts"])

        # ====================================================
        # TEST 4: UNAVAILABLE FACULTY
        # Move to unavailable slot
        # ====================================================
        # Mark Dr. Turing UNAVAILABLE on Wednesday P5
        client.post("/api/faculty-availability", json={
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "facultyId": fac1_id,
            "workingDayId": wed_id,
            "timeSlotId": p5_id,
            "availabilityStatus": "UNAVAILABLE"
        })

        unavail_res = client.post(f"/api/timetables/{tt_id}/edit/preview-move", json={
            "entryId": target_entry["id"],
            "targetWorkingDayId": wed_id,
            "targetTimeSlotId": p5_id
        })
        assert unavail_res.status_code == 200
        assert unavail_res.json()["data"]["valid"] is False
        assert any(c["type"] == "FACULTY_UNAVAILABLE" for c in unavail_res.json()["data"]["conflicts"])

        # ====================================================
        # TEST 5: RESOURCE CONFLICT
        # Lab occupied by another class or session
        # ====================================================
        # Occupy res1_id on Wednesday P4 directly in timetable_entries
        mongo_c = MongoClient("mongodb://localhost:27017")
        mongo_c["master_scheduler"]["timetable_entries"].insert_one({
            "timetableId": tt_id,
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_b_id,
            "workingDayId": wed_id,
            "timeSlotId": p4_id,
            "entryType": "ACTIVITY",
            "resourceId": res1_id,
            "title": "Lab Maintenance",
            "isFixed": False,
            "isLocked": False,
            "isGenerated": False,
            "isActive": True,
        })

        # Try to move lab block to Wednesday P4
        res_conflict_prev = client.post(f"/api/timetables/{tt_id}/edit/preview-move", json={
            "entryId": lab_entries[0]["id"],
            "targetWorkingDayId": wed_id,
            "targetTimeSlotId": p4_id
        })
        assert res_conflict_prev.status_code == 200
        assert res_conflict_prev.json()["data"]["valid"] is False
        assert any(c["type"] in ("RESOURCE_CONFLICT", "LAB_BLOCK_INVALID") for c in res_conflict_prev.json()["data"]["conflicts"])

        # ====================================================
        # TEST 6: LOCKED FIXED ENTRY
        # Try moving a fixed entry
        # ====================================================
        fixed_insert = mongo_c["master_scheduler"]["timetable_entries"].insert_one({
            "timetableId": tt_id,
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "classId": cls_a_id,
            "workingDayId": wed_id,
            "timeSlotId": p3_id,
            "entryType": "ACTIVITY",
            "title": "Library Fixed",
            "isFixed": True,
            "isLocked": True,
            "isGenerated": False,
            "isActive": True,
        })
        fixed_id = str(fixed_insert.inserted_id)
        mongo_c.close()

        fixed_move_res = client.post(f"/api/timetables/{tt_id}/edit/preview-move", json={
            "entryId": fixed_id,
            "targetWorkingDayId": wed_id,
            "targetTimeSlotId": p5_id
        })
        assert fixed_move_res.status_code == 200
        assert fixed_move_res.json()["data"]["valid"] is False
        assert any(c["type"] == "LOCKED_ENTRY" for c in fixed_move_res.json()["data"]["conflicts"])

        # ====================================================
        # TEST 7: MANUAL LOCK & UNLOCK
        # ====================================================
        ds_entry = ds_entries[0]
        # Lock entry
        lock_res = client.patch(f"/api/timetables/{tt_id}/entries/{ds_entry['id']}/lock")
        assert lock_res.status_code == 200

        # Move attempt blocked
        locked_prev = client.post(f"/api/timetables/{tt_id}/edit/preview-move", json={
            "entryId": ds_entry["id"],
            "targetWorkingDayId": wed_id,
            "targetTimeSlotId": p5_id
        })
        assert locked_prev.status_code == 200
        assert locked_prev.json()["data"]["valid"] is False
        assert any(c["type"] == "LOCKED_ENTRY" for c in locked_prev.json()["data"]["conflicts"])

        # Unlock entry
        unlock_res = client.patch(f"/api/timetables/{tt_id}/entries/{ds_entry['id']}/unlock")
        assert unlock_res.status_code == 200

        # Check that LOCKED_ENTRY is no longer returned
        unlocked_prev = client.post(f"/api/timetables/{tt_id}/edit/preview-move", json={
            "entryId": ds_entry["id"],
            "targetWorkingDayId": wed_id,
            "targetTimeSlotId": p5_id
        })
        assert not any(c["type"] == "LOCKED_ENTRY" for c in unlocked_prev.json()["data"]["conflicts"])

        # ====================================================
        # TEST 8: PERIOD SWAP
        # ====================================================
        os_to_swap = os_entries[1]
        ds_to_swap = ds_entries[1]

        # Find two theory entries for Class A whose swap is valid
        valid_pair = None
        debug_reasons = []
        for e1 in os_entries:
            for e2 in ds_entries:
                chk = client.post(f"/api/timetables/{tt_id}/edit/preview-swap", json={
                    "firstEntryId": e1["id"],
                    "secondEntryId": e2["id"]
                }).json()["data"]
                debug_reasons.append((chk.get("conflicts")))
                if chk.get("valid"):
                    valid_pair = (e1, e2)
                    break
            if valid_pair:
                break

        assert valid_pair is not None, f"Should find at least one valid swap pair between OS and DS. Tried: {debug_reasons}"
        os_to_swap, ds_to_swap = valid_pair

        cur_rev = client.get(f"/api/timetables/{tt_id}").json()["data"]["revision"]
        swap_res = client.post(f"/api/timetables/{tt_id}/edit/swap", json={
            "firstEntryId": os_to_swap["id"],
            "secondEntryId": ds_to_swap["id"],
            "expectedRevision": cur_rev
        })
        assert swap_res.status_code == 200
        assert swap_res.json()["data"]["success"] is True

        # ====================================================
        # TEST 9: INVALID SWAP
        # Swapping with locked/fixed entry is rejected
        # ====================================================
        inv_swap = client.post(f"/api/timetables/{tt_id}/edit/preview-swap", json={
            "firstEntryId": fixed_id,
            "secondEntryId": os_to_swap["id"]
        })
        assert inv_swap.status_code == 200
        assert inv_swap.json()["data"]["valid"] is False
        assert any(c["type"] == "LOCKED_ENTRY" for c in inv_swap.json()["data"]["conflicts"])

        # ====================================================
        # TEST 10 & 11: LAB BLOCK MOVE & LUNCH BOUNDARY VIOLATION
        # P3 (11:00-12:00) is followed by Lunch (12:00-13:00, non-teaching)!
        # A 2-period lab starting at P3 crosses the lunch boundary!
        # ====================================================
        lab_lunch_prev = client.post(f"/api/timetables/{tt_id}/edit/preview-move", json={
            "entryId": lab_entries[0]["id"],
            "targetWorkingDayId": mon_id,
            "targetTimeSlotId": p3_id  # P3 is adjacent to lunch, cannot fit 2 consecutive periods!
        })
        assert lab_lunch_prev.status_code == 200
        assert lab_lunch_prev.json()["data"]["valid"] is False
        assert any(c["type"] == "LAB_BLOCK_INVALID" for c in lab_lunch_prev.json()["data"]["conflicts"]), f"Actual conflicts: {lab_lunch_prev.json()['data']['conflicts']}"

        # ====================================================
        # TEST 14: REMOVE ENTRY & SHORTAGE DETECTION
        # ====================================================
        cur_rev = client.get(f"/api/timetables/{tt_id}").json()["data"]["revision"]
        rem_res = client.delete(f"/api/timetables/{tt_id}/entries/{os_entries[2]['id']}?expectedRevision={cur_rev}")
        assert rem_res.status_code == 200
        assert rem_res.json()["data"]["validationStatus"] == "INVALID"
        cur_rev = rem_res.json()["data"]["newRevision"]

        # ====================================================
        # TEST 12: MANUAL ADD
        # Add back valid OS subject period
        # ====================================================
        # Find a free teaching slot for Class A AND free/available for Dr. Turing
        fresh_entries = client.get(f"/api/timetables/{tt_id}/entries").json()["data"]
        occ_a = {(e["workingDayId"], e["timeSlotId"]) for e in fresh_entries if e["classId"] == cls_a_id}
        occ_turing = {(e["workingDayId"], e["timeSlotId"]) for e in fresh_entries if fac1_id in e.get("facultyIds", [])}
        all_busy_add = occ_a.union(occ_turing)
        all_busy_add.add((wed_id, p5_id))  # Turing marked unavailable on Wed P5 in Test 4

        add_slot = None
        for d in [mon_id, tue_id, wed_id]:
            for s in teaching_slots:
                if (d, s) not in all_busy_add:
                    add_slot = (d, s)
                    break
            if add_slot:
                break
        assert add_slot is not None

        add_res = client.post(f"/api/timetables/{tt_id}/entries", json={
            "classId": cls_a_id,
            "workingDayId": add_slot[0],
            "timeSlotId": add_slot[1],
            "entryType": "SUBJECT",
            "subjectId": sub1_id,
            "facultyIds": [fac1_id],
            "expectedRevision": cur_rev
        })
        assert add_res.status_code == 201
        cur_rev = add_res.json()["data"]["newRevision"]

        # ====================================================
        # TEST 13: WEEKLY OVERFLOW
        # Adding a 4th OS period when allocation is 3
        # ====================================================
        overflow_res = client.post(f"/api/timetables/{tt_id}/entries", json={
            "classId": cls_a_id,
            "workingDayId": wed_id,
            "timeSlotId": p5_id,
            "entryType": "SUBJECT",
            "subjectId": sub1_id,
            "facultyIds": [fac1_id],
            "expectedRevision": cur_rev
        })
        assert overflow_res.status_code == 409
        assert "weekly" in overflow_res.text.lower() or "conflict" in overflow_res.text.lower()

        # ====================================================
        # TEST 15 & 16: PARTIAL REGENERATION & LOCK PRESERVATION
        # ====================================================
        fresh_entries = client.get(f"/api/timetables/{tt_id}/entries").json()["data"]
        first_ds = [e for e in fresh_entries if e["subjectId"] == sub2_id][0]
        client.patch(f"/api/timetables/{tt_id}/entries/{first_ds['id']}/lock")

        # Preview partial regeneration for Class A on Monday
        regen_prev = client.post(f"/api/timetables/{tt_id}/regenerate/preview", json={
            "scope": {
                "classIds": [cls_a_id],
                "workingDayIds": [mon_id]
            },
            "preserveLockedEntries": True,
            "solverOptions": {"maxSolveSeconds": 10}
        })
        assert regen_prev.status_code == 200
        prev_data = regen_prev.json()["data"]
        assert prev_data["success"] is True
        token = prev_data["previewToken"]
        assert token.startswith("prev_")

        # ====================================================
        # TEST 18: PREVIEW APPLY
        # ====================================================
        cur_rev = client.get(f"/api/timetables/{tt_id}").json()["data"]["revision"]
        apply_regen = client.post(f"/api/timetables/{tt_id}/regenerate/apply", json={
            "previewToken": token,
            "expectedRevision": cur_rev
        })
        assert apply_regen.status_code == 200
        cur_rev = apply_regen.json()["data"]["newRevision"]

        # Confirm locked entry is intact
        post_regen_entries = client.get(f"/api/timetables/{tt_id}/entries").json()["data"]
        found_locked = [e for e in post_regen_entries if e["id"] == first_ds["id"]]
        assert len(found_locked) == 1
        assert found_locked[0]["isLocked"] is True

        # ====================================================
        # TEST 19: STALE PREVIEW
        # ====================================================
        stale_apply = client.post(f"/api/timetables/{tt_id}/regenerate/apply", json={
            "previewToken": token,
            "expectedRevision": cur_rev
        })
        assert stale_apply.status_code == 409

        # ====================================================
        # TEST 20: UNDO
        # ====================================================
        # Perform a move and undo it
        movable = [e for e in post_regen_entries if not e.get("isLocked") and not e.get("isFixed") and e["classId"] == cls_a_id and e.get("subjectId")]
        if movable:
            entry_m = movable[0]
            # Find free slot
            occ_a2 = {(e["workingDayId"], e["timeSlotId"]) for e in post_regen_entries if e["classId"] == cls_a_id}
            target_free = None
            for d in [mon_id, tue_id, wed_id]:
                for s in teaching_slots:
                    if (d, s) not in occ_a2:
                        target_free = (d, s)
                        break
                if target_free:
                    break
            if target_free:
                m_res = client.patch(f"/api/timetables/{tt_id}/entries/{entry_m['id']}/move", json={
                    "targetWorkingDayId": target_free[0],
                    "targetTimeSlotId": target_free[1],
                    "expectedRevision": cur_rev
                })
                if m_res.status_code == 200:
                    new_rev = m_res.json()["data"]["newRevision"]
                    last_h = client.get(f"/api/timetables/{tt_id}/history").json()["data"][0]
                    undo_res = client.post(f"/api/timetables/{tt_id}/history/{last_h['id']}/undo", json={
                        "expectedRevision": new_rev
                    })
                    assert undo_res.status_code == 200
                    cur_rev = undo_res.json()["data"]["newRevision"]

        # ====================================================
        # TEST 21: CONCURRENT REVISION CHECK
        # ====================================================
        stale_edit_res = client.post(f"/api/timetables/{tt_id}/entries", json={
            "classId": cls_a_id,
            "workingDayId": mon_id,
            "timeSlotId": p1_id,
            "entryType": "ACTIVITY",
            "title": "Stale Concurrent Attempt",
            "expectedRevision": 1
        })
        assert stale_edit_res.status_code == 409

        # ====================================================
        # TEST 22: POST-EDIT & TIMETABLE VALIDATE API
        # ====================================================
        val_res = client.post(f"/api/timetables/{tt_id}/validate")
        assert val_res.status_code == 200
        val_data = val_res.json()["data"]
        assert val_data["status"] in ("VALID", "INVALID")
        assert "summary" in val_data
        assert "issues" in val_data

    cleanup_test_records()
