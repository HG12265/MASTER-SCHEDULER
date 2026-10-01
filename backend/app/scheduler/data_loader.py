from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple
from app.repositories.academic_year_repository import academic_year_repo
from app.repositories.semester_type_repository import semester_type_repo
from app.repositories.working_day_repository import working_day_repo
from app.repositories.time_slot_repository import time_slot_repo
from app.repositories.class_repository import class_repo
from app.repositories.subject_repository import subject_repo
from app.repositories.faculty_repository import faculty_repo
from app.repositories.resource_repository import resource_repo
from app.repositories.faculty_allocation_repository import faculty_allocation_repo
from app.repositories.faculty_availability_repository import faculty_availability_repo
from app.repositories.fixed_slot_repository import fixed_slot_repo
from app.repositories.scheduling_settings_repository import scheduling_settings_repo
from app.repositories.class_constraint_repository import class_constraint_repo
from app.repositories.faculty_constraint_repository import faculty_constraint_repo
from app.repositories.subject_constraint_repository import subject_constraint_repo
from app.scheduler.types import (
    NormalizedSlot,
    NormalizedBlock,
    NormalizedAllocation,
    NormalizedFixedSlot,
    SchedulerInputData,
)
from app.utils.exceptions import NotFoundException, BadRequestException


class SchedulerDataLoader:
    async def load_data(
        self,
        academic_year_id: str,
        semester_type_id: str,
        class_ids: Optional[List[str]] = None,
    ) -> SchedulerInputData:
        # 1. Master term verification
        ay = await academic_year_repo.get_by_id(academic_year_id)
        if not ay:
            raise NotFoundException(f"Academic year with ID '{academic_year_id}' not found")

        st = await semester_type_repo.get_by_id(semester_type_id)
        if not st:
            raise NotFoundException(f"Semester type with ID '{semester_type_id}' not found")

        # 2. Batch load baseline entities
        all_working_days = await working_day_repo.find_many({"isActive": True})
        active_working_days = [d for d in all_working_days if d.get("isWorkingDay", True)]
        active_working_days.sort(key=lambda d: d.get("dayOrder", 0))

        all_time_slots = await time_slot_repo.find_many({"isActive": True})
        teaching_slots = [t for t in all_time_slots if t.get("isTeachingSlot", True)]
        teaching_slots.sort(key=lambda t: t.get("slotOrder", 0))

        if not active_working_days or not teaching_slots:
            raise BadRequestException("Cannot schedule: no active working days or teaching slots configured.")

        # 3. Build normalized slots
        slots: List[NormalizedSlot] = []
        slot_by_key: Dict[Tuple[str, str], NormalizedSlot] = {}
        slot_by_idx: Dict[int, NormalizedSlot] = {}
        slot_idx_counter = 0

        for day in active_working_days:
            for ts in teaching_slots:
                ns = NormalizedSlot(
                    slot_idx=slot_idx_counter,
                    working_day_id=day["id"],
                    time_slot_id=ts["id"],
                    day_order=day.get("dayOrder", 0),
                    slot_order=ts.get("slotOrder", 0),
                    is_teaching=True,
                    day_name=day.get("name", ""),
                    slot_name=ts.get("name", ""),
                    start_time=ts.get("startTime", ""),
                    end_time=ts.get("endTime", ""),
                )
                slots.append(ns)
                slot_by_key[(day["id"], ts["id"])] = ns
                slot_by_idx[slot_idx_counter] = ns
                slot_idx_counter += 1

        # 4. Classes filter
        class_query: Dict[str, Any] = {
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
            "isActive": True,
        }
        if class_ids and len(class_ids) > 0:
            from app.utils.object_id import parse_object_id
            class_query["_id"] = {"$in": [parse_object_id(c, "Class") for c in class_ids]}

        classes = await class_repo.find_many(class_query)
        if not classes:
            raise BadRequestException("No active classes found to schedule for the selected term.")

        class_map = {c["id"]: c for c in classes}
        target_class_ids = set(class_map.keys())

        # 5. Load subjects, faculty, resources
        all_subjects = await subject_repo.find_many({"isActive": True})
        subject_map = {s["id"]: s for s in all_subjects}

        all_faculty = await faculty_repo.find_many({"isActive": True})
        faculty_map = {f["id"]: f for f in all_faculty}

        all_resources = await resource_repo.find_many({"isActive": True})
        resource_map = {r["id"]: r for r in all_resources}

        # 6. Load fixed slots for term
        raw_fixed_slots = await fixed_slot_repo.find_many({
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
            "isActive": True,
        })

        normalized_fixed: List[NormalizedFixedSlot] = []
        fixed_subject_counts: Dict[Tuple[str, str], int] = defaultdict(int)

        for fs in raw_fixed_slots:
            slot_key = (fs["workingDayId"], fs["timeSlotId"])
            if slot_key in slot_by_key:
                ns = slot_by_key[slot_key]
                n_fs = NormalizedFixedSlot(
                    id=fs["id"],
                    class_id=fs["classId"],
                    working_day_id=fs["workingDayId"],
                    time_slot_id=fs["timeSlotId"],
                    slot_idx=ns.slot_idx,
                    slot_category=fs.get("slotCategory", "OTHER"),
                    subject_id=fs.get("subjectId"),
                    faculty_ids=fs.get("facultyIds", []),
                    resource_id=fs.get("resourceId"),
                    title=fs.get("title") or fs.get("slotCategory", "Fixed"),
                    is_locked=fs.get("isLocked", True),
                )
                normalized_fixed.append(n_fs)

                # If fixed slot is tied to a specific subject in this class, track period count
                if fs.get("subjectId") and fs.get("classId") in target_class_ids:
                    fixed_subject_counts[(fs["classId"], fs["subjectId"])] += 1

        # 7. Load Allocations
        alloc_query: Dict[str, Any] = {
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
            "classId": {"$in": list(target_class_ids)},
            "isActive": True,
        }
        raw_allocations = await faculty_allocation_repo.find_many(alloc_query)

        normalized_allocations: List[NormalizedAllocation] = []
        alloc_idx = 0
        required_block_sizes: Set[int] = {1}

        for a in raw_allocations:
            subj = subject_map.get(a["subjectId"])
            cls_doc = class_map.get(a["classId"])
            weekly_hrs = a.get("weeklyHours", 0)
            block_sz = a.get("blockSize", 1) or 1
            is_consec = a.get("requiresConsecutivePeriods", False) or (block_sz > 1)

            fixed_cnt = fixed_subject_counts.get((a["classId"], a["subjectId"]), 0)
            rem_hrs = max(0, weekly_hrs - fixed_cnt)

            if block_sz > 1:
                required_block_sizes.add(block_sz)

            na = NormalizedAllocation(
                alloc_idx=alloc_idx,
                allocation_id=a["id"],
                class_id=a["classId"],
                subject_id=a["subjectId"],
                faculty_ids=a.get("facultyIds", []),
                weekly_hours=weekly_hrs,
                block_size=block_sz,
                requires_consecutive=is_consec,
                preferred_resource_id=a.get("preferredResourceId"),
                subject_type=subj.get("subjectType", "THEORY") if subj else "THEORY",
                subject_name=subj.get("name", "Subject") if subj else "Subject",
                subject_code=subj.get("subjectCode", "SUBJ") if subj else "SUBJ",
                class_name=cls_doc.get("name", "Class") if cls_doc else "Class",
                effective_remaining_hours=rem_hrs,
                fixed_periods_count=fixed_cnt,
            )
            normalized_allocations.append(na)
            alloc_idx += 1

        # 8. Load Faculty Availability
        raw_avail = await faculty_availability_repo.find_many({
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
            "isActive": True,
        })
        faculty_avail_map: Dict[Tuple[str, str, str], str] = {}
        for av in raw_avail:
            faculty_avail_map[(av["facultyId"], av["workingDayId"], av["timeSlotId"])] = av.get("availabilityStatus", "AVAILABLE")

        # 9. Load Scheduling Settings
        settings_doc = await scheduling_settings_repo.find_by_term(academic_year_id, semester_type_id)
        if not settings_doc:
            # Fall back to active current or baseline defaults
            settings_doc = await scheduling_settings_repo.find_active_current() or {}

        # 10. Load Constraints (Class, Faculty, Subject)
        raw_c_cons = await class_constraint_repo.find_many({
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
            "isActive": True,
        })
        class_cons_map = {c["classId"]: c for c in raw_c_cons}

        raw_f_cons = await faculty_constraint_repo.find_many({
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
            "isActive": True,
        })
        faculty_cons_map = {f["facultyId"]: f for f in raw_f_cons}

        raw_s_cons = await subject_constraint_repo.find_many({
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
            "isActive": True,
        })
        subject_cons_map = {(s["classId"], s["subjectId"]): s for s in raw_s_cons}

        # 11. Precompute Valid Consecutive Blocks
        # For each day and each requested block size B:
        # A block is valid if all B teaching slots are on the same day and have strictly consecutive slotOrder.
        valid_blocks_by_size: Dict[int, List[NormalizedBlock]] = defaultdict(list)
        block_counter = 0

        # Group slots by day
        slots_by_day: Dict[str, List[NormalizedSlot]] = defaultdict(list)
        for s in slots:
            slots_by_day[s.working_day_id].append(s)

        for d_id, d_slots in slots_by_day.items():
            d_slots.sort(key=lambda s: s.slot_order)
            day_order = d_slots[0].day_order

            for sz in required_block_sizes:
                if sz <= len(d_slots):
                    for i in range(len(d_slots) - sz + 1):
                        window = d_slots[i : i + sz]
                        # Verify strict consecutiveness (no non-teaching lunch/break gap)
                        is_continuous = all(
                            window[j + 1].slot_order == window[j].slot_order + 1
                            for j in range(sz - 1)
                        )
                        if is_continuous:
                            b = NormalizedBlock(
                                block_idx=block_counter,
                                working_day_id=d_id,
                                day_order=day_order,
                                slot_indices=[s.slot_idx for s in window],
                                start_slot_idx=window[0].slot_idx,
                                block_size=sz,
                            )
                            valid_blocks_by_size[sz].append(b)
                            block_counter += 1

        return SchedulerInputData(
            academic_year_id=academic_year_id,
            academic_year_name=ay.get("name", ""),
            semester_type_id=semester_type_id,
            semester_type_name=st.get("name", ""),
            classes=classes,
            class_map=class_map,
            slots=slots,
            slot_by_key=slot_by_key,
            slot_by_idx=slot_by_idx,
            working_days=active_working_days,
            teaching_time_slots=teaching_slots,
            allocations=normalized_allocations,
            fixed_slots=normalized_fixed,
            faculty_map=faculty_map,
            subject_map=subject_map,
            resource_map=resource_map,
            faculty_availability=faculty_avail_map,
            settings=settings_doc,
            class_constraints=class_cons_map,
            faculty_constraints=faculty_cons_map,
            subject_constraints=subject_cons_map,
            valid_blocks_by_size=valid_blocks_by_size,
        )


scheduler_data_loader = SchedulerDataLoader()
