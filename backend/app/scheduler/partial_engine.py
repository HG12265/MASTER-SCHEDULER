import logging
import time
from uuid import uuid4
from bson import ObjectId
from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple
from ortools.sat.python import cp_model
from app.repositories.timetable_repository import timetable_repo, timetable_entry_repo
from app.repositories.timetable_change_history_repository import timetable_change_history_repo
from app.scheduler.data_loader import scheduler_data_loader
from app.scheduler.model_builder import SchedulerModelBuilder
from app.scheduler.solution_extractor import solution_extractor
from app.scheduler.types import (
    SchedulerInputData,
    NormalizedSlot,
    NormalizedBlock,
    NormalizedAllocation,
    NormalizedFixedSlot,
    GeneratedEntry,
    SchedulerOutput,
)
from app.schemas.timetable import (
    RegenerationScope,
    RegenerationPreviewResponse,
    MovedEntryDiff,
)
from app.utils.exceptions import ConflictException, NotFoundException

logger = logging.getLogger(__name__)

# Temporary in-memory cache for preview tokens (TTL: 15 minutes)
PREVIEW_CACHE: Dict[str, Dict[str, Any]] = {}


class PartialRegenerationEngine:
    def clean_expired_previews(self):
        now = time.time()
        expired = [token for token, val in PREVIEW_CACHE.items() if val.get("expiresAt", 0) < now]
        for t in expired:
            PREVIEW_CACHE.pop(t, None)

    async def preview_regeneration(
        self,
        timetable_id: str,
        scope: RegenerationScope,
        preserve_locked_entries: bool = True,
        max_solve_seconds: int = 20,
        num_workers: int = 4,
    ) -> RegenerationPreviewResponse:
        self.clean_expired_previews()

        tt = await timetable_repo.get_by_id(timetable_id)
        if not tt:
            raise NotFoundException(f"Timetable '{timetable_id}' not found")

        if tt.get("status") != "DRAFT":
            raise ConflictException(f"Only DRAFT timetables can be regenerated. Current status is {tt.get('status')}.")

        ay_id = tt["academicYearId"]
        st_id = tt["semesterTypeId"]
        current_revision = tt.get("revision", 1)

        # 1. Fetch current active timetable entries
        current_entries = await timetable_entry_repo.find_entries(timetable_id)
        entry_map = {e["id"]: e for e in current_entries}

        # 2. Determine Scope of Regeneration
        # An entry is in scope if:
        # - Any of scope filter matches (classIds, facultyIds, workingDayIds, timeSlotIds, entryIds)
        # If scope is entirely empty, all unlocked entries in the timetable are in scope
        has_filter = bool(
            scope.classIds
            or scope.facultyIds
            or scope.workingDayIds
            or scope.timeSlotIds
            or scope.entryIds
        )

        scope_class_ids = set(scope.classIds)
        scope_faculty_ids = set(scope.facultyIds)
        scope_day_ids = set(scope.workingDayIds)
        scope_slot_ids = set(scope.timeSlotIds)
        scope_entry_ids = set(scope.entryIds)

        entries_to_regenerate: List[Dict[str, Any]] = []
        frozen_entries: List[Dict[str, Any]] = []

        for e in current_entries:
            # System fixed entries are always frozen
            if e.get("isFixed"):
                frozen_entries.append(e)
                continue

            # Manually locked entries
            if preserve_locked_entries and (e.get("isManuallyLocked") or e.get("isLocked")):
                frozen_entries.append(e)
                continue

            if not has_filter:
                # Whole draft in scope
                entries_to_regenerate.append(e)
                continue

            # Match against criteria
            matches = False
            if e["id"] in scope_entry_ids:
                matches = True
            elif scope_class_ids and e["classId"] in scope_class_ids:
                matches = True
            elif scope_day_ids and e["workingDayId"] in scope_day_ids:
                matches = True
            elif scope_slot_ids and e["timeSlotId"] in scope_slot_ids:
                matches = True
            elif scope_faculty_ids and any(f in scope_faculty_ids for f in e.get("facultyIds", [])):
                matches = True

            if matches:
                entries_to_regenerate.append(e)
            else:
                frozen_entries.append(e)

        if not entries_to_regenerate:
            return RegenerationPreviewResponse(
                previewToken="",
                solverStatus="NO_OP",
                success=True,
                message="No unlocked entries fall within the requested regeneration scope.",
                changedEntries=0,
                addedEntries=0,
                removedEntries=0,
                movedEntries=[],
                warnings=["Scope selected only contains locked or system-fixed entries."],
                expectedRevision=current_revision,
            )

        # 3. Load baseline data for the term
        data: SchedulerInputData = await scheduler_data_loader.load_data(
            academic_year_id=ay_id,
            semester_type_id=st_id,
            class_ids=tt.get("classIds"),
        )

        # 4. Integrate Frozen Entries as Additional Fixed Slots
        # This guarantees CP-SAT respects their class, faculty, and room reservations!
        synthetic_fixed = list(data.fixed_slots)
        for fe in frozen_entries:
            slot_doc = data.slot_by_key.get((fe["workingDayId"], fe["timeSlotId"]))
            if slot_doc:
                synthetic_fixed.append(
                    NormalizedFixedSlot(
                        id=f"frozen_{fe['id']}",
                        class_id=fe["classId"],
                        working_day_id=fe["workingDayId"],
                        time_slot_id=fe["timeSlotId"],
                        slot_idx=slot_doc.slot_idx,
                        slot_category=fe.get("entryType", "SUBJECT"),
                        subject_id=fe.get("subjectId"),
                        faculty_ids=fe.get("facultyIds", []),
                        resource_id=fe.get("resourceId"),
                        title=fe.get("title", ""),
                        is_locked=True,
                    )
                )

        # 5. Adjust allocation remaining hours:
        # Count how many periods of each allocation are already FROZEN in place
        frozen_allocation_counts: Dict[Tuple[str, str], int] = defaultdict(int)
        for fe in frozen_entries:
            if fe.get("subjectId") and fe.get("entryType") == "SUBJECT":
                frozen_allocation_counts[(fe["classId"], fe["subjectId"])] += 1

        adjusted_allocations: List[NormalizedAllocation] = []
        for alloc in data.allocations:
            frozen_count = frozen_allocation_counts.get((alloc.class_id, alloc.subject_id), 0)
            remaining_for_solver = max(0, alloc.weekly_hours - frozen_count)
            if remaining_for_solver > 0:
                adjusted_allocations.append(
                    NormalizedAllocation(
                        alloc_idx=len(adjusted_allocations),
                        allocation_id=alloc.allocation_id,
                        class_id=alloc.class_id,
                        subject_id=alloc.subject_id,
                        faculty_ids=alloc.faculty_ids,
                        weekly_hours=alloc.weekly_hours,
                        block_size=alloc.block_size,
                        requires_consecutive=alloc.requires_consecutive,
                        preferred_resource_id=alloc.preferred_resource_id,
                        subject_type=alloc.subject_type,
                        subject_name=alloc.subject_name,
                        subject_code=alloc.subject_code,
                        class_name=alloc.class_name,
                        effective_remaining_hours=remaining_for_solver,
                        fixed_periods_count=frozen_count,
                    )
                )

        # Create updated input data with synthetic fixed slots and adjusted allocations
        regen_data = SchedulerInputData(
            academic_year_id=data.academic_year_id,
            academic_year_name=data.academic_year_name,
            semester_type_id=data.semester_type_id,
            semester_type_name=data.semester_type_name,
            classes=data.classes,
            class_map=data.class_map,
            slots=data.slots,
            slot_by_key=data.slot_by_key,
            slot_by_idx=data.slot_by_idx,
            working_days=data.working_days,
            teaching_time_slots=data.teaching_time_slots,
            allocations=adjusted_allocations,
            fixed_slots=synthetic_fixed,
            faculty_map=data.faculty_map,
            subject_map=data.subject_map,
            resource_map=data.resource_map,
            faculty_availability=data.faculty_availability,
            settings=data.settings,
            class_constraints=data.class_constraints,
            faculty_constraints=data.faculty_constraints,
            subject_constraints=data.subject_constraints,
            valid_blocks_by_size=data.valid_blocks_by_size,
        )

        # 6. Build and Solve Partial CP-SAT Model
        builder = SchedulerModelBuilder(regen_data)
        model, session_vars, sessions = builder.build_model()

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = float(max_solve_seconds)
        solver.parameters.num_search_workers = int(num_workers)

        status_code = solver.solve(model)
        status_map = {
            cp_model.OPTIMAL: "OPTIMAL",
            cp_model.FEASIBLE: "FEASIBLE",
            cp_model.INFEASIBLE: "INFEASIBLE",
            cp_model.UNKNOWN: "UNKNOWN",
        }
        status_name = status_map.get(status_code, "UNKNOWN")

        if status_code not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return RegenerationPreviewResponse(
                previewToken="",
                solverStatus=status_name,
                success=False,
                message=f"Partial regeneration could not produce a feasible schedule within the selected scope ({status_name}). Consider expanding the scope or unlocking dependent faculty periods.",
                changedEntries=0,
                addedEntries=0,
                removedEntries=0,
                movedEntries=[],
                warnings=["Scope over-constrained: insufficient available slots or faculty availability."],
                expectedRevision=current_revision,
            )

        # 7. Extract Newly Solved Entries
        solved_output: SchedulerOutput = solution_extractor.extract_solution(
            solver=solver,
            data=regen_data,
            sessions=sessions,
            session_vars=session_vars,
            status_name=status_name,
            duration_ms=0,
        )

        # Filter out the synthetic fixed entries (we already have frozen_entries)
        new_entries: List[GeneratedEntry] = [
            e for e in solved_output.entries if not e.is_fixed
        ]

        # 8. Compute Diff against `entries_to_regenerate`
        moved_diffs: List[MovedEntryDiff] = []
        old_by_alloc = defaultdict(list)
        for e in entries_to_regenerate:
            if e.get("subjectId"):
                old_by_alloc[(e["classId"], e["subjectId"])].append(e)

        new_by_alloc = defaultdict(list)
        for ne in new_entries:
            if ne.subject_id:
                new_by_alloc[(ne.class_id, ne.subject_id)].append(ne)

        changed_count = 0
        all_keys = set(old_by_alloc.keys()).union(new_by_alloc.keys())
        day_map = {d["id"]: d.get("name", d["id"]) for d in data.working_days}
        slot_map = {s["id"]: s.get("name", s["id"]) for s in data.teaching_time_slots}

        for (cid, sid) in all_keys:
            old_list = old_by_alloc[(cid, sid)]
            new_list = new_by_alloc[(cid, sid)]
            s_name = data.subject_map.get(sid, {}).get("name", "Subject")
            s_code = data.subject_map.get(sid, {}).get("code", "SUB")
            c_name = data.class_map.get(cid, {}).get("name", "Class")

            for i in range(max(len(old_list), len(new_list))):
                old_e = old_list[i] if i < len(old_list) else None
                new_e = new_list[i] if i < len(new_list) else None

                if old_e and new_e:
                    if (old_e["workingDayId"] != new_e.working_day_id or old_e["timeSlotId"] != new_e.time_slot_id):
                        changed_count += 1
                        moved_diffs.append(
                            MovedEntryDiff(
                                entryId=old_e["id"],
                                subjectName=s_name,
                                subjectCode=s_code,
                                className=c_name,
                                fromDayName=day_map.get(old_e["workingDayId"]),
                                fromTimeSlotName=slot_map.get(old_e["timeSlotId"]),
                                toDayName=day_map.get(new_e.working_day_id),
                                toTimeSlotName=slot_map.get(new_e.time_slot_id),
                            )
                        )
                elif old_e and not new_e:
                    changed_count += 1
                elif new_e and not old_e:
                    changed_count += 1

        # 9. Store Preview in Cache
        preview_token = f"prev_{uuid4().hex[:16]}"
        PREVIEW_CACHE[preview_token] = {
            "timetableId": timetable_id,
            "expectedRevision": current_revision,
            "entriesToDelete": [e["id"] for e in entries_to_regenerate],
            "newEntries": new_entries,
            "expiresAt": time.time() + 900,  # 15 min TTL
        }

        return RegenerationPreviewResponse(
            previewToken=preview_token,
            solverStatus=status_name,
            success=True,
            message=f"Regeneration preview computed successfully with {changed_count} changed/rearranged periods.",
            changedEntries=changed_count,
            addedEntries=max(0, len(new_entries) - len(entries_to_regenerate)),
            removedEntries=max(0, len(entries_to_regenerate) - len(new_entries)),
            movedEntries=moved_diffs,
            warnings=[],
            expectedRevision=current_revision,
        )

    async def apply_regeneration(
        self,
        timetable_id: str,
        preview_token: str,
        expected_revision: int,
        performed_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        self.clean_expired_previews()

        cached = PREVIEW_CACHE.get(preview_token)
        if not cached:
            raise ConflictException("Regeneration preview has expired or is invalid. Please generate a new preview.")

        if cached["timetableId"] != timetable_id:
            raise ConflictException("Preview token does not belong to this timetable.")

        tt = await timetable_repo.get_by_id(timetable_id)
        if not tt:
            raise NotFoundException(f"Timetable '{timetable_id}' not found.")

        current_rev = tt.get("revision", 1)
        if current_rev != expected_revision or current_rev != cached["expectedRevision"]:
            raise ConflictException(
                f"Timetable has been modified by another edit (current revision: {current_rev}, expected: {expected_revision}). Please refresh and preview again."
            )

        # 1. Fetch before snapshot for history
        entries_to_delete_ids = cached["entriesToDelete"]
        delete_oids = [ObjectId(eid) for eid in entries_to_delete_ids]
        before_entries = await timetable_entry_repo.find_many({"_id": {"$in": delete_oids}})

        # 2. Delete regenerated entries
        db = timetable_repo.collection.database
        await db.timetable_entries.delete_many({"_id": {"$in": delete_oids}})

        # 3. Insert new entries
        new_docs = []
        for ne in cached["newEntries"]:
            new_docs.append({
                "timetableId": timetable_id,
                "academicYearId": tt["academicYearId"],
                "semesterTypeId": tt["semesterTypeId"],
                "classId": ne.class_id,
                "workingDayId": ne.working_day_id,
                "timeSlotId": ne.time_slot_id,
                "allocationId": ne.allocation_id,
                "subjectId": ne.subject_id,
                "facultyIds": ne.faculty_ids,
                "resourceId": ne.resource_id,
                "entryType": ne.entry_type,
                "title": ne.title,
                "blockId": ne.block_id,
                "blockSize": ne.block_size,
                "blockIndex": ne.block_index,
                "isFixed": False,
                "isLocked": False,
                "isManuallyLocked": False,
                "isGenerated": True,
                "isActive": True,
            })

        new_ids = await timetable_entry_repo.insert_many_entries(new_docs)

        # 4. Increment Revision & Log Change History
        new_revision = current_rev + 1
        await timetable_repo.update_by_id(timetable_id, {"revision": new_revision, "validationStatus": "VALID"})

        await timetable_change_history_repo.log_change(
            timetable_id=timetable_id,
            revision=new_revision,
            change_type="PARTIAL_REGENERATION",
            description=f"Partial regeneration replaced {len(before_entries)} periods with {len(new_ids)} optimized periods.",
            before_snapshot=before_entries,
            after_snapshot=new_docs,
            affected_entry_ids=new_ids,
            performed_by=performed_by,
        )

        # Remove consumed token
        PREVIEW_CACHE.pop(preview_token, None)

        return {
            "success": True,
            "message": f"Partial regeneration applied successfully. Revision updated to {new_revision}.",
            "newRevision": new_revision,
            "regeneratedCount": len(new_ids),
        }


partial_regeneration_engine = PartialRegenerationEngine()
