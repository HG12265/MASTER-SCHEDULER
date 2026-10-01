from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple
from app.repositories.timetable_repository import timetable_repo, timetable_entry_repo
from app.repositories.academic_year_repository import academic_year_repo
from app.repositories.semester_type_repository import semester_type_repo
from app.repositories.working_day_repository import working_day_repo
from app.repositories.time_slot_repository import time_slot_repo
from app.repositories.class_repository import class_repo
from app.repositories.faculty_repository import faculty_repo
from app.repositories.subject_repository import subject_repo
from app.repositories.resource_repository import resource_repo
from app.repositories.faculty_allocation_repository import faculty_allocation_repo
from app.repositories.faculty_availability_repository import faculty_availability_repo
from app.repositories.fixed_slot_repository import fixed_slot_repo
from app.repositories.class_constraint_repository import class_constraint_repo
from app.repositories.faculty_constraint_repository import faculty_constraint_repo
from app.repositories.subject_constraint_repository import subject_constraint_repo
from app.schemas.timetable import (
    ConflictType,
    TimetableEditConflict,
    TimetableValidationIssue,
    TimetableValidationReport,
    TimetableValidationSummary,
)
from app.utils.exceptions import NotFoundException, ConflictException


class TimetableConflictContext:
    def __init__(
        self,
        timetable: Dict[str, Any],
        entries: List[Dict[str, Any]],
        days: List[Dict[str, Any]],
        slots: List[Dict[str, Any]],
        classes: Dict[str, Dict[str, Any]],
        faculty: Dict[str, Dict[str, Any]],
        subjects: Dict[str, Dict[str, Any]],
        resources: Dict[str, Dict[str, Any]],
        allocations: List[Dict[str, Any]],
        availability: Dict[Tuple[str, str, str], str],  # (faculty_id, day_id, slot_id) -> status
        class_constraints: Dict[str, Dict[str, Any]],
        faculty_constraints: Dict[str, Dict[str, Any]],
        subject_constraints: Dict[Tuple[str, str], Dict[str, Any]],
    ):
        self.timetable = timetable
        self.entries = entries
        self.days = days
        self.slots = slots
        self.classes = classes
        self.faculty = faculty
        self.subjects = subjects
        self.resources = resources
        self.allocations = allocations
        self.availability = availability
        self.class_constraints = class_constraints
        self.faculty_constraints = faculty_constraints
        self.subject_constraints = subject_constraints

        # Fast lookups
        self.day_map = {d["id"]: d for d in days}
        self.slot_map = {s["id"]: s for s in slots}
        self.entry_map = {e["id"]: e for e in entries}

        # Sorted teaching slots
        self.sorted_teaching_slots = sorted(
            [
                s for s in slots
                if s.get("isTeachingSlot", True)
                and not s.get("isBreak")
                and not s.get("isLunch")
                and s.get("slotType") not in ("BREAK", "LUNCH")
            ],
            key=lambda x: x.get("slotOrder", 0),
        )
        self.sorted_all_slots = sorted(slots, key=lambda x: x.get("slotOrder", 0))
        self.slot_order_map = {s["id"]: idx for idx, s in enumerate(self.sorted_all_slots)}


class TimetableConflictService:
    async def load_context(self, timetable_id: str) -> TimetableConflictContext:
        tt = await timetable_repo.get_by_id(timetable_id)
        if not tt:
            raise NotFoundException(f"Timetable '{timetable_id}' not found")

        ay_id = tt["academicYearId"]
        st_id = tt["semesterTypeId"]

        # Fetch records in parallel
        entries = await timetable_entry_repo.find_entries(timetable_id)
        days = await working_day_repo.find_many({"isWorkingDay": True})
        slots = await time_slot_repo.find_many({})
        class_list = await class_repo.find_many({"academicYearId": ay_id, "semesterTypeId": st_id, "isActive": True})
        faculty_list = await faculty_repo.find_many({"isActive": True})
        subject_list = await subject_repo.find_many({"isActive": True})
        resource_list = await resource_repo.find_many({"isActive": True})
        alloc_list = await faculty_allocation_repo.find_many({"academicYearId": ay_id, "semesterTypeId": st_id, "isActive": True})

        # Availability
        avail_list = await faculty_availability_repo.find_many({"academicYearId": ay_id, "semesterTypeId": st_id, "isActive": True})
        avail_map: Dict[Tuple[str, str, str], str] = {}
        for a in avail_list:
            avail_map[(a["facultyId"], a["workingDayId"], a["timeSlotId"])] = a.get("availabilityStatus", "AVAILABLE")

        # Constraints
        cc_list = await class_constraint_repo.find_many({"academicYearId": ay_id, "semesterTypeId": st_id})
        fc_list = await faculty_constraint_repo.find_many({"academicYearId": ay_id, "semesterTypeId": st_id})
        sc_list = await subject_constraint_repo.find_many({"academicYearId": ay_id, "semesterTypeId": st_id})

        return TimetableConflictContext(
            timetable=tt,
            entries=entries,
            days=days,
            slots=slots,
            classes={c["id"]: c for c in class_list},
            faculty={f["id"]: f for f in faculty_list},
            subjects={s["id"]: s for s in subject_list},
            resources={r["id"]: r for r in resource_list},
            allocations=alloc_list,
            availability=avail_map,
            class_constraints={c["classId"]: c for c in cc_list},
            faculty_constraints={f["facultyId"]: f for f in fc_list},
            subject_constraints={(s["classId"], s["subjectId"]): s for s in sc_list},
        )

    def get_block_entries(self, ctx: TimetableConflictContext, entry: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Returns all entries belonging to the same multi-period block."""
        block_id = entry.get("blockId")
        if not block_id:
            return [entry]
        same_block = [e for e in ctx.entries if e.get("blockId") == block_id]
        same_block.sort(key=lambda e: (e.get("blockIndex", 0), ctx.slot_order_map.get(e["timeSlotId"], 0)))
        return same_block if same_block else [entry]

    def get_consecutive_teaching_slots(
        self, ctx: TimetableConflictContext, start_slot_id: str, count: int
    ) -> Tuple[Optional[List[Dict[str, Any]]], Optional[str]]:
        """
        Starting from `start_slot_id`, finds `count` contiguous slots.
        Returns (slots, error_message).
        Fails if any slot in the span is a break, lunch, or if the day ends prematurely.
        """
        start_idx = ctx.slot_order_map.get(start_slot_id)
        if start_idx is None:
            return None, "Target time slot does not exist"

        all_slots = ctx.sorted_all_slots
        if start_idx + count > len(all_slots):
            return None, f"Not enough periods remaining in the day for a {count}-period block"

        span_slots = all_slots[start_idx : start_idx + count]
        for s in span_slots:
            is_break_or_lunch = (
                s.get("isBreak")
                or s.get("isLunch")
                or s.get("slotType") in ("BREAK", "LUNCH")
                or not s.get("isTeachingSlot", True)
            )
            if is_break_or_lunch:
                label = "Lunch period" if (s.get("slotType") == "LUNCH" or s.get("isLunch")) else "Break/Non-teaching period"
                return None, f"Block would cross {label} ({s.get('name')}). Lab blocks must not span breaks."

        return span_slots, None

    def check_move_conflicts(
        self,
        ctx: TimetableConflictContext,
        entry_id: str,
        target_day_id: str,
        target_slot_id: str,
        ignore_entry_ids: Optional[Set[str]] = None,
    ) -> Tuple[bool, List[TimetableEditConflict], List[str], List[Dict[str, Any]], int, Optional[Dict[str, Any]]]:
        """
        Validates moving an entry (and its entire block if multi-period) to target_day_id and target_slot_id.
        Returns: (is_valid, conflicts, warnings, affected_entries, block_size, occupying_entry)
        """
        conflicts: List[TimetableEditConflict] = []
        warnings: List[str] = []
        ignore_ids = set(ignore_entry_ids or [])

        entry = ctx.entry_map.get(entry_id)
        if not entry:
            conflicts.append(TimetableEditConflict(
                type=ConflictType.LOCKED_ENTRY,
                message=f"Timetable entry '{entry_id}' not found.",
            ))
            return False, conflicts, warnings, [], 1, None

        # 1. Lock check
        if entry.get("isFixed"):
            conflicts.append(TimetableEditConflict(
                type=ConflictType.LOCKED_ENTRY,
                message=f"'{entry.get('title')}' is a system-fixed slot and cannot be moved.",
                details={"entryId": entry_id, "isFixed": True},
            ))
            return False, conflicts, warnings, [], 1, None

        if entry.get("isManuallyLocked") or entry.get("isLocked"):
            conflicts.append(TimetableEditConflict(
                type=ConflictType.LOCKED_ENTRY,
                message=f"'{entry.get('title')}' is manually locked. Unlock the period before moving.",
                details={"entryId": entry_id, "isLocked": True},
            ))
            return False, conflicts, warnings, [], 1, None

        # 2. Block collection
        block_entries = self.get_block_entries(ctx, entry)
        block_size = len(block_entries)
        for b_entry in block_entries:
            ignore_ids.add(b_entry["id"])

        # 3. Check target day & slot existence
        target_day = ctx.day_map.get(target_day_id)
        if not target_day:
            conflicts.append(TimetableEditConflict(
                type=ConflictType.NON_TEACHING_SLOT,
                message=f"Target working day '{target_day_id}' is invalid or inactive.",
            ))
            return False, conflicts, warnings, block_entries, block_size, None

        target_slot = ctx.slot_map.get(target_slot_id)
        if not target_slot:
            conflicts.append(TimetableEditConflict(
                type=ConflictType.NON_TEACHING_SLOT,
                message=f"Target time slot '{target_slot_id}' is invalid.",
            ))
            return False, conflicts, warnings, block_entries, block_size, None

        # 4. Consecutive slots check for block
        target_slots, block_err = self.get_consecutive_teaching_slots(ctx, target_slot_id, block_size)
        if block_err or not target_slots:
            conflicts.append(TimetableEditConflict(
                type=ConflictType.LAB_BLOCK_INVALID if block_size > 1 else ConflictType.NON_TEACHING_SLOT,
                message=block_err or "Invalid target slot sequence for block.",
                details={"blockSize": block_size, "startSlot": target_slot.get("name")},
            ))
            return False, conflicts, warnings, block_entries, block_size, None

        class_id = entry["classId"]
        class_name = ctx.classes.get(class_id, {}).get("name", "Class")
        subject_id = entry.get("subjectId")
        subject_doc = ctx.subjects.get(subject_id, {}) if subject_id else {}
        subject_name = subject_doc.get("name", entry.get("title", "Subject"))
        faculty_ids = entry.get("facultyIds", [])
        resource_id = entry.get("resourceId")
        resource_name = ctx.resources.get(resource_id, {}).get("name", "Room") if resource_id else ""

        occupying_entry: Optional[Dict[str, Any]] = None

        # 5. Evaluate each slot in the proposed block placement
        for offset, cur_slot in enumerate(target_slots):
            cur_slot_id = cur_slot["id"]
            cur_slot_name = cur_slot.get("name", f"Period {offset + 1}")

            # Check other entries at this exact (day, slot)
            slot_entries = [
                e for e in ctx.entries
                if e["workingDayId"] == target_day_id
                and e["timeSlotId"] == cur_slot_id
                and e["id"] not in ignore_ids
                and e.get("isActive", True)
            ]

            # A. Class Conflict
            for e in slot_entries:
                if e["classId"] == class_id:
                    occupying_entry = e
                    occ_title = e.get("subjectName") or e.get("title") or "Existing Activity"
                    conflicts.append(TimetableEditConflict(
                        type=ConflictType.CLASS_CONFLICT,
                        message=f"{class_name} already has '{occ_title}' scheduled on {target_day['name']} at {cur_slot_name}.",
                        details={
                            "classId": class_id,
                            "occupyingEntryId": e["id"],
                            "workingDayId": target_day_id,
                            "timeSlotId": cur_slot_id,
                        },
                    ))

            # B. Faculty Conflict & Availability
            for fac_id in faculty_ids:
                fac_name = ctx.faculty.get(fac_id, {}).get("name", "Faculty")
                # Availability check
                avail_status = ctx.availability.get((fac_id, target_day_id, cur_slot_id), "AVAILABLE")
                if avail_status == "UNAVAILABLE":
                    conflicts.append(TimetableEditConflict(
                        type=ConflictType.FACULTY_UNAVAILABLE,
                        message=f"{fac_name} is marked UNAVAILABLE on {target_day['name']} at {cur_slot_name}.",
                        details={"facultyId": fac_id, "day": target_day["name"], "slot": cur_slot_name},
                    ))
                elif avail_status == "AVOID":
                    warnings.append(f"{fac_name} has preferred to AVOID teaching on {target_day['name']} at {cur_slot_name}.")

                # Conflict across all other classes
                for e in slot_entries:
                    if fac_id in e.get("facultyIds", []):
                        other_class = ctx.classes.get(e["classId"], {}).get("name", "another class")
                        conflicts.append(TimetableEditConflict(
                            type=ConflictType.FACULTY_CONFLICT,
                            message=f"{fac_name} is already teaching {other_class} ('{e.get('title')}') on {target_day['name']} at {cur_slot_name}.",
                            details={
                                "facultyId": fac_id,
                                "conflictingClassId": e["classId"],
                                "workingDayId": target_day_id,
                                "timeSlotId": cur_slot_id,
                            },
                        ))

            # C. Resource Conflict
            if resource_id:
                for e in slot_entries:
                    if e.get("resourceId") == resource_id:
                        other_class = ctx.classes.get(e["classId"], {}).get("name", "another class")
                        conflicts.append(TimetableEditConflict(
                            type=ConflictType.RESOURCE_CONFLICT,
                            message=f"Resource '{resource_name}' is already booked by {other_class} on {target_day['name']} at {cur_slot_name}.",
                            details={
                                "resourceId": resource_id,
                                "conflictingClassId": e["classId"],
                                "workingDayId": target_day_id,
                                "timeSlotId": cur_slot_id,
                            },
                        ))

            # D. Class Blocked Slot
            c_constraint = ctx.class_constraints.get(class_id)
            if c_constraint:
                blocked_keys = {
                    (b["workingDayId"], b["timeSlotId"])
                    for b in c_constraint.get("blockedSlots", [])
                }
                if (target_day_id, cur_slot_id) in blocked_keys:
                    conflicts.append(TimetableEditConflict(
                        type=ConflictType.CLASS_BLOCKED_SLOT,
                        message=f"{class_name} has {target_day['name']} at {cur_slot_name} blocked by department policy.",
                        details={"classId": class_id, "workingDayId": target_day_id, "timeSlotId": cur_slot_id},
                    ))

        # 6. Check Daily Workload Limits in Simulated Result
        # Compute new daily hours for class & faculty on target_day_id
        day_entries_class = [
            e for e in ctx.entries
            if e["classId"] == class_id
            and e["workingDayId"] == target_day_id
            and e["id"] not in ignore_ids
            and e.get("isActive", True)
        ]
        new_class_day_periods = len(day_entries_class) + block_size

        c_constraint = ctx.class_constraints.get(class_id)
        if c_constraint and c_constraint.get("maxPeriodsPerDay"):
            max_p = c_constraint["maxPeriodsPerDay"]
            if new_class_day_periods > max_p:
                conflicts.append(TimetableEditConflict(
                    type=ConflictType.CLASS_DAILY_LIMIT,
                    message=f"{class_name} would exceed maximum daily periods ({new_class_day_periods}/{max_p}) on {target_day['name']}.",
                    details={"classId": class_id, "maxDaily": max_p, "projected": new_class_day_periods},
                ))

        # Faculty daily workload
        for fac_id in faculty_ids:
            fac_name = ctx.faculty.get(fac_id, {}).get("name", "Faculty")
            f_constraint = ctx.faculty_constraints.get(fac_id)
            max_daily_hours = f_constraint.get("maxDailyHours") if f_constraint else ctx.timetable.get("solverOptions", {}).get("maxFacultyDailyHours", 5)

            day_entries_fac = [
                e for e in ctx.entries
                if fac_id in e.get("facultyIds", [])
                and e["workingDayId"] == target_day_id
                and e["id"] not in ignore_ids
                and e.get("isActive", True)
            ]
            new_fac_day_hours = len(day_entries_fac) + block_size
            if max_daily_hours and new_fac_day_hours > max_daily_hours:
                conflicts.append(TimetableEditConflict(
                    type=ConflictType.FACULTY_DAILY_LIMIT,
                    message=f"{fac_name} would exceed daily workload limit ({new_fac_day_hours}/{max_daily_hours} hrs) on {target_day['name']}.",
                    details={"facultyId": fac_id, "maxDailyHours": max_daily_hours, "projected": new_fac_day_hours},
                ))

        is_valid = len(conflicts) == 0
        message = "Move is valid with zero conflicts." if is_valid else f"Move blocked by {len(conflicts)} conflict(s)."
        return is_valid, conflicts, warnings, block_entries, block_size, occupying_entry

    def check_swap_conflicts(
        self,
        ctx: TimetableConflictContext,
        first_entry_id: str,
        second_entry_id: str,
    ) -> Tuple[bool, List[TimetableEditConflict], List[str], str]:
        """
        Validates atomic swapping of two timetable entries.
        Handles multi-period lab block swapping atomically.
        """
        conflicts: List[TimetableEditConflict] = []
        warnings: List[str] = []

        entry_a = ctx.entry_map.get(first_entry_id)
        entry_b = ctx.entry_map.get(second_entry_id)

        if not entry_a or not entry_b:
            conflicts.append(TimetableEditConflict(
                type=ConflictType.LOCKED_ENTRY,
                message="One or both timetable entries for swap could not be found.",
            ))
            return False, conflicts, warnings, "Entries not found."

        # Lock checks
        if entry_a.get("isFixed") or entry_b.get("isFixed"):
            conflicts.append(TimetableEditConflict(
                type=ConflictType.LOCKED_ENTRY,
                message="System-fixed entries cannot be swapped.",
            ))
            return False, conflicts, warnings, "Cannot swap fixed entries."

        if (entry_a.get("isManuallyLocked") or entry_a.get("isLocked")) or (entry_b.get("isManuallyLocked") or entry_b.get("isLocked")):
            conflicts.append(TimetableEditConflict(
                type=ConflictType.LOCKED_ENTRY,
                message="Locked entries cannot be swapped. Please unlock first.",
            ))
            return False, conflicts, warnings, "Cannot swap locked entries."

        # Blocks
        block_a = self.get_block_entries(ctx, entry_a)
        block_b = self.get_block_entries(ctx, entry_b)

        if len(block_a) != len(block_b):
            conflicts.append(TimetableEditConflict(
                type=ConflictType.LAB_BLOCK_INVALID,
                message=f"Cannot swap sessions of differing duration ({len(block_a)} periods vs {len(block_b)} periods). Swapping requires equal block lengths.",
                details={"firstBlockSize": len(block_a), "secondBlockSize": len(block_b)},
            ))
            return False, conflicts, warnings, "Block length mismatch."

        # Simultaneous atomic check:
        # Move block A to B's position ignoring block B
        # Move block B to A's position ignoring block A
        target_day_b = block_b[0]["workingDayId"]
        target_slot_b = block_b[0]["timeSlotId"]
        ignore_b_ids = {e["id"] for e in block_b}

        target_day_a = block_a[0]["workingDayId"]
        target_slot_a = block_a[0]["timeSlotId"]
        ignore_a_ids = {e["id"] for e in block_a}

        # Check A -> B
        valid_a, conf_a, warn_a, _, _, _ = self.check_move_conflicts(
            ctx, entry_a["id"], target_day_b, target_slot_b, ignore_entry_ids=ignore_b_ids
        )
        # Check B -> A
        valid_b, conf_b, warn_b, _, _, _ = self.check_move_conflicts(
            ctx, entry_b["id"], target_day_a, target_slot_a, ignore_entry_ids=ignore_a_ids
        )

        conflicts.extend(conf_a)
        conflicts.extend(conf_b)
        warnings.extend(warn_a)
        warnings.extend(warn_b)

        is_valid = len(conflicts) == 0
        message = "Swap is valid with zero conflicts." if is_valid else f"Swap blocked by {len(conflicts)} conflict(s)."
        return is_valid, conflicts, warnings, message

    def check_manual_add_conflicts(
        self,
        ctx: TimetableConflictContext,
        class_id: str,
        working_day_id: str,
        time_slot_id: str,
        subject_id: Optional[str],
        faculty_ids: List[str],
        resource_id: Optional[str],
        entry_type: str = "SUBJECT",
    ) -> Tuple[bool, List[TimetableEditConflict], List[str]]:
        conflicts: List[TimetableEditConflict] = []
        warnings: List[str] = []

        day = ctx.day_map.get(working_day_id)
        slot = ctx.slot_map.get(time_slot_id)
        if not day or not slot:
            conflicts.append(TimetableEditConflict(
                type=ConflictType.NON_TEACHING_SLOT,
                message="Target day or time slot is invalid.",
            ))
            return False, conflicts, warnings

        if slot.get("isBreak") or slot.get("isLunch"):
            conflicts.append(TimetableEditConflict(
                type=ConflictType.NON_TEACHING_SLOT,
                message=f"Cannot add period during {slot.get('name')} (Break/Lunch).",
            ))
            return False, conflicts, warnings

        class_doc = ctx.classes.get(class_id)
        class_name = class_doc.get("name", "Class") if class_doc else "Class"

        # Check existing entries at slot
        slot_entries = [
            e for e in ctx.entries
            if e["workingDayId"] == working_day_id
            and e["timeSlotId"] == time_slot_id
            and e.get("isActive", True)
        ]

        for e in slot_entries:
            if e["classId"] == class_id:
                conflicts.append(TimetableEditConflict(
                    type=ConflictType.CLASS_CONFLICT,
                    message=f"{class_name} already has '{e.get('title')}' on {day['name']} at {slot.get('name')}.",
                ))

        # Check faculty availability & clashes
        for fac_id in faculty_ids:
            fac_name = ctx.faculty.get(fac_id, {}).get("name", "Faculty")
            avail_status = ctx.availability.get((fac_id, working_day_id, time_slot_id), "AVAILABLE")
            if avail_status == "UNAVAILABLE":
                conflicts.append(TimetableEditConflict(
                    type=ConflictType.FACULTY_UNAVAILABLE,
                    message=f"{fac_name} is marked UNAVAILABLE on {day['name']} at {slot.get('name')}.",
                ))
            elif avail_status == "AVOID":
                warnings.append(f"{fac_name} prefers to avoid {day['name']} at {slot.get('name')}.")

            for e in slot_entries:
                if fac_id in e.get("facultyIds", []):
                    other_class = ctx.classes.get(e["classId"], {}).get("name", "another class")
                    conflicts.append(TimetableEditConflict(
                        type=ConflictType.FACULTY_CONFLICT,
                        message=f"{fac_name} is already teaching {other_class} on {day['name']} at {slot.get('name')}.",
                    ))

        # Check resource clashes
        if resource_id:
            res_name = ctx.resources.get(resource_id, {}).get("name", "Room")
            for e in slot_entries:
                if e.get("resourceId") == resource_id:
                    other_class = ctx.classes.get(e["classId"], {}).get("name", "another class")
                    conflicts.append(TimetableEditConflict(
                        type=ConflictType.RESOURCE_CONFLICT,
                        message=f"Resource '{res_name}' is occupied by {other_class} on {day['name']} at {slot.get('name')}.",
                    ))

        # Check weekly hour overflow if SUBJECT
        if entry_type == "SUBJECT" and subject_id:
            subj_doc = ctx.subjects.get(subject_id, {})
            subj_name = subj_doc.get("name", "Subject")
            matching_alloc = next(
                (a for a in ctx.allocations if a["classId"] == class_id and a["subjectId"] == subject_id),
                None
            )
            if not matching_alloc:
                conflicts.append(TimetableEditConflict(
                    type=ConflictType.SUBJECT_WEEKLY_OVERFLOW,
                    message=f"No faculty-subject allocation exists for '{subj_name}' in {class_name}.",
                ))
            else:
                required_hours = matching_alloc.get("weeklyHours", 0)
                current_scheduled = sum(
                    1 for e in ctx.entries
                    if e["classId"] == class_id and e.get("subjectId") == subject_id and e.get("isActive", True)
                )
                if current_scheduled + 1 > required_hours:
                    conflicts.append(TimetableEditConflict(
                        type=ConflictType.SUBJECT_WEEKLY_OVERFLOW,
                        message=f"'{subj_name}' already has all {required_hours} required weekly periods ({current_scheduled}/{required_hours}). Adding another period would exceed curriculum allocation.",
                        details={"required": required_hours, "scheduled": current_scheduled},
                    ))

        return len(conflicts) == 0, conflicts, warnings

    def validate_entire_timetable(self, ctx: TimetableConflictContext) -> TimetableValidationReport:
        """
        Comprehensive post-edit audit of all entries in the timetable against all 20 rules.
        """
        issues: List[TimetableValidationIssue] = []

        # 1. Slot clashing maps
        class_slot_map: Dict[Tuple[str, str, str], List[Dict[str, Any]]] = defaultdict(list)
        faculty_slot_map: Dict[Tuple[str, str, str], List[Dict[str, Any]]] = defaultdict(list)
        resource_slot_map: Dict[Tuple[str, str, str], List[Dict[str, Any]]] = defaultdict(list)

        for e in ctx.entries:
            if not e.get("isActive", True):
                continue
            day_id = e["workingDayId"]
            slot_id = e["timeSlotId"]

            # Class map
            class_slot_map[(e["classId"], day_id, slot_id)].append(e)

            # Faculty map
            for fid in e.get("facultyIds", []):
                faculty_slot_map[(fid, day_id, slot_id)].append(e)

            # Resource map
            if e.get("resourceId"):
                resource_slot_map[(e["resourceId"], day_id, slot_id)].append(e)

        # Check double-bookings
        for (cid, did, sid), elist in class_slot_map.items():
            if len(elist) > 1:
                cname = ctx.classes.get(cid, {}).get("name", cid)
                dname = ctx.day_map.get(did, {}).get("name", did)
                sname = ctx.slot_map.get(sid, {}).get("name", sid)
                issues.append(TimetableValidationIssue(
                    code="CLASS_CONFLICT",
                    severity="ERROR",
                    message=f"Class {cname} has {len(elist)} overlapping periods on {dname} at {sname}.",
                    entityType="class",
                    entityId=cid,
                ))

        for (fid, did, sid), elist in faculty_slot_map.items():
            if len(elist) > 1:
                fname = ctx.faculty.get(fid, {}).get("name", fid)
                dname = ctx.day_map.get(did, {}).get("name", did)
                sname = ctx.slot_map.get(sid, {}).get("name", sid)
                issues.append(TimetableValidationIssue(
                    code="FACULTY_CONFLICT",
                    severity="ERROR",
                    message=f"Faculty {fname} has {len(elist)} simultaneous teaching assignments on {dname} at {sname}.",
                    entityType="faculty",
                    entityId=fid,
                ))

        for (rid, did, sid), elist in resource_slot_map.items():
            if len(elist) > 1:
                rname = ctx.resources.get(rid, {}).get("name", rid)
                dname = ctx.day_map.get(did, {}).get("name", did)
                sname = ctx.slot_map.get(sid, {}).get("name", sid)
                issues.append(TimetableValidationIssue(
                    code="RESOURCE_CONFLICT",
                    severity="ERROR",
                    message=f"Room/Lab {rname} is double-booked by {len(elist)} classes on {dname} at {sname}.",
                    entityType="resource",
                    entityId=rid,
                ))

        # 2. Check Faculty Unavailability
        for e in ctx.entries:
            if not e.get("isActive", True):
                continue
            did = e["workingDayId"]
            sid = e["timeSlotId"]
            dname = ctx.day_map.get(did, {}).get("name", did)
            sname = ctx.slot_map.get(sid, {}).get("name", sid)
            for fid in e.get("facultyIds", []):
                if ctx.availability.get((fid, did, sid)) == "UNAVAILABLE":
                    fname = ctx.faculty.get(fid, {}).get("name", fid)
                    issues.append(TimetableValidationIssue(
                        code="FACULTY_UNAVAILABLE",
                        severity="ERROR",
                        message=f"{fname} is scheduled on {dname} at {sname} but is marked UNAVAILABLE.",
                        entityType="faculty",
                        entityId=fid,
                    ))

        # 3. Check Allocation Weekly Hours Coverage
        alloc_counts: Dict[Tuple[str, str], int] = defaultdict(int)
        for e in ctx.entries:
            if e.get("isActive", True) and e.get("subjectId") and e.get("entryType") == "SUBJECT":
                alloc_counts[(e["classId"], e["subjectId"])] += 1

        for a in ctx.allocations:
            cid = a["classId"]
            sid = a["subjectId"]
            req_h = a.get("weeklyHours", 0)
            actual_h = alloc_counts.get((cid, sid), 0)
            cname = ctx.classes.get(cid, {}).get("name", cid)
            sname = ctx.subjects.get(sid, {}).get("name", sid)

            if actual_h < req_h:
                issues.append(TimetableValidationIssue(
                    code="SUBJECT_WEEKLY_SHORTAGE",
                    severity="ERROR",
                    message=f"Shortage: {cname} has only {actual_h}/{req_h} periods scheduled for '{sname}'.",
                    entityType="subject",
                    entityId=sid,
                ))
            elif actual_h > req_h:
                issues.append(TimetableValidationIssue(
                    code="SUBJECT_WEEKLY_OVERFLOW",
                    severity="ERROR",
                    message=f"Overflow: {cname} has {actual_h}/{req_h} periods scheduled for '{sname}'.",
                    entityType="subject",
                    entityId=sid,
                ))

        errors = sum(1 for i in issues if i.severity == "ERROR")
        warnings = sum(1 for i in issues if i.severity == "WARNING")
        status = "VALID" if errors == 0 else "INVALID"

        return TimetableValidationReport(
            status=status,
            summary=TimetableValidationSummary(errors=errors, warnings=warnings),
            issues=issues,
        )


timetable_conflict_service = TimetableConflictService()
