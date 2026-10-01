from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from app.repositories.timetable_repository import timetable_repo, timetable_entry_repo
from app.repositories.timetable_change_history_repository import timetable_change_history_repo
from app.services.timetable_conflict_service import timetable_conflict_service, TimetableConflictContext
from app.schemas.timetable import (
    MovePreviewRequest,
    MovePreviewResponse,
    ApplyMoveRequest,
    SwapPreviewRequest,
    SwapPreviewResponse,
    ApplySwapRequest,
    ManualEntryCreateRequest,
    TimetableValidationReport,
)
from app.utils.exceptions import ConflictException, NotFoundException, BadRequestException
from app.utils.object_id import doc_to_dict


class TimetableEditService:
    def _verify_editable(self, tt: Dict[str, Any]):
        if tt.get("status") != "DRAFT":
            raise ConflictException(
                f"Published or archived timetables cannot be edited directly (current status: {tt.get('status')}). Create a draft version first."
            )

    def _verify_revision(self, tt: Dict[str, Any], expected_revision: int):
        current_rev = tt.get("revision", 1)
        if current_rev != expected_revision:
            raise ConflictException(
                f"Timetable has been modified by another session (current revision: {current_rev}, expected: {expected_revision}). Refresh before applying this change."
            )

    async def preview_move(self, timetable_id: str, req: MovePreviewRequest) -> MovePreviewResponse:
        ctx = await timetable_conflict_service.load_context(timetable_id)
        self._verify_editable(ctx.timetable)

        is_valid, conflicts, warnings, affected_entries, block_size, occ_entry = (
            timetable_conflict_service.check_move_conflicts(
                ctx=ctx,
                entry_id=req.entryId,
                target_day_id=req.targetWorkingDayId,
                target_slot_id=req.targetTimeSlotId,
            )
        )

        return MovePreviewResponse(
            valid=is_valid,
            conflicts=conflicts,
            warnings=warnings,
            affectedEntries=affected_entries,
            message="This move is valid." if is_valid else f"Move blocked by {len(conflicts)} conflict(s).",
            blockSize=block_size,
            occupyingEntry=occ_entry,
        )

    async def apply_move(
        self,
        timetable_id: str,
        entry_id: str,
        req: ApplyMoveRequest,
        performed_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        ctx = await timetable_conflict_service.load_context(timetable_id)
        self._verify_editable(ctx.timetable)
        self._verify_revision(ctx.timetable, req.expectedRevision)

        # 1. Re-validate conflict check
        is_valid, conflicts, warnings, affected_entries, block_size, occ_entry = (
            timetable_conflict_service.check_move_conflicts(
                ctx=ctx,
                entry_id=entry_id,
                target_day_id=req.targetWorkingDayId,
                target_slot_id=req.targetTimeSlotId,
            )
        )
        if not is_valid:
            conflict_msg = "; ".join([c.message for c in conflicts])
            raise ConflictException(f"Move rejected due to conflicts: {conflict_msg}")

        # 2. Get target slots for block
        target_slots, _ = timetable_conflict_service.get_consecutive_teaching_slots(
            ctx, req.targetTimeSlotId, block_size
        )
        if not target_slots or len(target_slots) != block_size:
            raise BadRequestException("Target slots are invalid for this block.")

        # 3. Create before snapshot
        before_snapshot = [dict(e) for e in affected_entries]
        now = datetime.now(timezone.utc)
        db = timetable_repo.collection.database

        # 4. Update each entry in the block
        after_snapshot = []
        for idx, b_entry in enumerate(affected_entries):
            new_slot = target_slots[idx]
            update_data = {
                "workingDayId": req.targetWorkingDayId,
                "timeSlotId": new_slot["id"],
                "updatedAt": now,
            }
            await db.timetable_entries.update_one(
                {"_id": ObjectId(b_entry["id"])},
                {"$set": update_data},
            )
            updated_doc = dict(b_entry)
            updated_doc.update(update_data)
            after_snapshot.append(updated_doc)

        # 5. Increment revision & record history
        new_revision = ctx.timetable.get("revision", 1) + 1
        entry_title = affected_entries[0].get("title", "Period")
        day_name = ctx.day_map.get(req.targetWorkingDayId, {}).get("name", "Day")
        start_slot_name = target_slots[0].get("name", "Slot")

        await timetable_repo.update_by_id(timetable_id, {"revision": new_revision})

        await timetable_change_history_repo.log_change(
            timetable_id=timetable_id,
            revision=new_revision,
            change_type="MOVE",
            description=f"Moved '{entry_title}' ({block_size} period(s)) to {day_name} starting at {start_slot_name}.",
            before_snapshot=before_snapshot,
            after_snapshot=after_snapshot,
            affected_entry_ids=[e["id"] for e in affected_entries],
            performed_by=performed_by,
        )

        # 6. Post-edit validation
        new_ctx = await timetable_conflict_service.load_context(timetable_id)
        report = timetable_conflict_service.validate_entire_timetable(new_ctx)
        await timetable_repo.update_by_id(timetable_id, {
            "validationStatus": report.status,
            "validationIssues": [i.model_dump() for i in report.issues],
        })

        return {
            "success": True,
            "message": f"Successfully moved '{entry_title}'. Revision updated to {new_revision}.",
            "newRevision": new_revision,
            "validationStatus": report.status,
            "validationSummary": report.summary.model_dump(),
        }

    async def preview_swap(self, timetable_id: str, req: SwapPreviewRequest) -> SwapPreviewResponse:
        ctx = await timetable_conflict_service.load_context(timetable_id)
        self._verify_editable(ctx.timetable)

        is_valid, conflicts, warnings, message = timetable_conflict_service.check_swap_conflicts(
            ctx=ctx,
            first_entry_id=req.firstEntryId,
            second_entry_id=req.secondEntryId,
        )
        return SwapPreviewResponse(
            valid=is_valid,
            conflicts=conflicts,
            warnings=warnings,
            message=message,
        )

    async def apply_swap(
        self,
        timetable_id: str,
        req: ApplySwapRequest,
        performed_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        ctx = await timetable_conflict_service.load_context(timetable_id)
        self._verify_editable(ctx.timetable)
        self._verify_revision(ctx.timetable, req.expectedRevision)

        # 1. Re-validate swap
        is_valid, conflicts, warnings, message = timetable_conflict_service.check_swap_conflicts(
            ctx=ctx,
            first_entry_id=req.firstEntryId,
            second_entry_id=req.secondEntryId,
        )
        if not is_valid:
            conflict_msg = "; ".join([c.message for c in conflicts])
            raise ConflictException(f"Swap rejected due to conflicts: {conflict_msg}")

        entry_a = ctx.entry_map[req.firstEntryId]
        entry_b = ctx.entry_map[req.secondEntryId]
        block_a = timetable_conflict_service.get_block_entries(ctx, entry_a)
        block_b = timetable_conflict_service.get_block_entries(ctx, entry_b)

        before_snapshot = [dict(e) for e in block_a + block_b]
        now = datetime.now(timezone.utc)
        db = timetable_repo.collection.database

        # 2. Swap slots atomically
        after_snapshot = []
        for idx in range(len(block_a)):
            ea = block_a[idx]
            eb = block_b[idx]

            day_a, slot_a = ea["workingDayId"], ea["timeSlotId"]
            day_b, slot_b = eb["workingDayId"], eb["timeSlotId"]

            await db.timetable_entries.update_one(
                {"_id": ObjectId(ea["id"])},
                {"$set": {"workingDayId": day_b, "timeSlotId": slot_b, "updatedAt": now}},
            )
            ea_doc = dict(ea)
            ea_doc.update({"workingDayId": day_b, "timeSlotId": slot_b, "updatedAt": now})
            after_snapshot.append(ea_doc)

            await db.timetable_entries.update_one(
                {"_id": ObjectId(eb["id"])},
                {"$set": {"workingDayId": day_a, "timeSlotId": slot_a, "updatedAt": now}},
            )
            eb_doc = dict(eb)
            eb_doc.update({"workingDayId": day_a, "timeSlotId": slot_a, "updatedAt": now})
            after_snapshot.append(eb_doc)

        # 3. Increment revision & record history
        new_revision = ctx.timetable.get("revision", 1) + 1
        title_a = entry_a.get("title", "Period A")
        title_b = entry_b.get("title", "Period B")

        await timetable_repo.update_by_id(timetable_id, {"revision": new_revision})

        await timetable_change_history_repo.log_change(
            timetable_id=timetable_id,
            revision=new_revision,
            change_type="SWAP",
            description=f"Swapped '{title_a}' with '{title_b}'.",
            before_snapshot=before_snapshot,
            after_snapshot=after_snapshot,
            affected_entry_ids=[e["id"] for e in block_a + block_b],
            performed_by=performed_by,
        )

        # 4. Post-edit validation
        new_ctx = await timetable_conflict_service.load_context(timetable_id)
        report = timetable_conflict_service.validate_entire_timetable(new_ctx)
        await timetable_repo.update_by_id(timetable_id, {
            "validationStatus": report.status,
            "validationIssues": [i.model_dump() for i in report.issues],
        })

        return {
            "success": True,
            "message": f"Successfully swapped '{title_a}' and '{title_b}'. Revision updated to {new_revision}.",
            "newRevision": new_revision,
            "validationStatus": report.status,
            "validationSummary": report.summary.model_dump(),
        }

    async def manual_add_entry(
        self,
        timetable_id: str,
        req: ManualEntryCreateRequest,
        performed_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        ctx = await timetable_conflict_service.load_context(timetable_id)
        self._verify_editable(ctx.timetable)
        self._verify_revision(ctx.timetable, req.expectedRevision)

        is_valid, conflicts, warnings = timetable_conflict_service.check_manual_add_conflicts(
            ctx=ctx,
            class_id=req.classId,
            working_day_id=req.workingDayId,
            time_slot_id=req.timeSlotId,
            subject_id=req.subjectId,
            faculty_ids=req.facultyIds,
            resource_id=req.resourceId,
            entry_type=req.entryType.value,
        )
        if not is_valid:
            conflict_msg = "; ".join([c.message for c in conflicts])
            raise ConflictException(f"Cannot add entry: {conflict_msg}")

        now = datetime.now(timezone.utc)
        subj_name = ctx.subjects.get(req.subjectId, {}).get("name") if req.subjectId else req.title or "Activity"

        entry_doc = {
            "timetableId": timetable_id,
            "academicYearId": ctx.timetable["academicYearId"],
            "semesterTypeId": ctx.timetable["semesterTypeId"],
            "classId": req.classId,
            "workingDayId": req.workingDayId,
            "timeSlotId": req.timeSlotId,
            "allocationId": None,
            "subjectId": req.subjectId,
            "facultyIds": req.facultyIds,
            "resourceId": req.resourceId,
            "entryType": req.entryType.value,
            "title": subj_name,
            "blockId": None,
            "blockSize": 1,
            "blockIndex": 0,
            "isFixed": False,
            "isLocked": req.lockAfterAdding,
            "isManuallyLocked": req.lockAfterAdding,
            "lockedAt": now if req.lockAfterAdding else None,
            "lockedBy": performed_by if req.lockAfterAdding else None,
            "isGenerated": False,
            "isActive": True,
        }

        created_ids = await timetable_entry_repo.insert_many_entries([entry_doc])
        new_id = created_ids[0]

        # Increment revision & log history
        new_revision = ctx.timetable.get("revision", 1) + 1
        await timetable_repo.update_by_id(timetable_id, {"revision": new_revision})

        await timetable_change_history_repo.log_change(
            timetable_id=timetable_id,
            revision=new_revision,
            change_type="ADD",
            description=f"Manually added '{subj_name}' period.",
            before_snapshot=[],
            after_snapshot=[dict(entry_doc, id=new_id)],
            affected_entry_ids=[new_id],
            performed_by=performed_by,
        )

        # Post-edit validation
        new_ctx = await timetable_conflict_service.load_context(timetable_id)
        report = timetable_conflict_service.validate_entire_timetable(new_ctx)
        await timetable_repo.update_by_id(timetable_id, {
            "validationStatus": report.status,
            "validationIssues": [i.model_dump() for i in report.issues],
        })

        return {
            "success": True,
            "message": f"Successfully assigned '{subj_name}'. Revision updated to {new_revision}.",
            "newEntryId": new_id,
            "newRevision": new_revision,
            "validationStatus": report.status,
            "validationSummary": report.summary.model_dump(),
        }

    async def remove_entry(
        self,
        timetable_id: str,
        entry_id: str,
        expected_revision: int,
        performed_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        ctx = await timetable_conflict_service.load_context(timetable_id)
        self._verify_editable(ctx.timetable)
        self._verify_revision(ctx.timetable, expected_revision)

        entry = ctx.entry_map.get(entry_id)
        if not entry:
            raise NotFoundException(f"Entry '{entry_id}' not found.")

        if entry.get("isFixed"):
            raise ConflictException("System-fixed entries cannot be deleted directly without modifying fixed slot configuration.")

        # If entry is in a block, remove all periods in the block
        block_entries = timetable_conflict_service.get_block_entries(ctx, entry)
        entry_ids_to_del = [e["id"] for e in block_entries]

        before_snapshot = [dict(e) for e in block_entries]
        db = timetable_repo.collection.database
        await db.timetable_entries.delete_many({"_id": {"$in": [ObjectId(eid) for eid in entry_ids_to_del]}})

        # Increment revision & log history
        new_revision = ctx.timetable.get("revision", 1) + 1
        title = entry.get("title", "Period")
        await timetable_repo.update_by_id(timetable_id, {"revision": new_revision})

        await timetable_change_history_repo.log_change(
            timetable_id=timetable_id,
            revision=new_revision,
            change_type="REMOVE",
            description=f"Removed '{title}' ({len(block_entries)} period(s)).",
            before_snapshot=before_snapshot,
            after_snapshot=[],
            affected_entry_ids=entry_ids_to_del,
            performed_by=performed_by,
        )

        # Post-edit validation (will detect weekly shortage if required!)
        new_ctx = await timetable_conflict_service.load_context(timetable_id)
        report = timetable_conflict_service.validate_entire_timetable(new_ctx)
        await timetable_repo.update_by_id(timetable_id, {
            "validationStatus": report.status,
            "validationIssues": [i.model_dump() for i in report.issues],
        })

        return {
            "success": True,
            "message": f"Successfully removed '{title}'. Revision updated to {new_revision}.",
            "newRevision": new_revision,
            "validationStatus": report.status,
            "validationSummary": report.summary.model_dump(),
        }

    async def lock_entry(
        self,
        timetable_id: str,
        entry_id: str,
        performed_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        tt = await timetable_repo.get_by_id(timetable_id)
        if not tt:
            raise NotFoundException("Timetable not found.")
        self._verify_editable(tt)

        entry = await timetable_entry_repo.get_by_id(entry_id)
        if not entry:
            raise NotFoundException(f"Entry '{entry_id}' not found.")

        now = datetime.now(timezone.utc)
        db = timetable_repo.collection.database

        # If part of block, lock entire block
        block_id = entry.get("blockId")
        filter_query = {"timetableId": timetable_id, "blockId": block_id} if block_id else {"_id": ObjectId(entry_id)}

        await db.timetable_entries.update_many(
            filter_query,
            {"$set": {
                "isLocked": True,
                "isManuallyLocked": True,
                "lockedAt": now,
                "lockedBy": performed_by,
                "updatedAt": now,
            }},
        )

        new_revision = tt.get("revision", 1) + 1
        await timetable_repo.update_by_id(timetable_id, {"revision": new_revision})

        await timetable_change_history_repo.log_change(
            timetable_id=timetable_id,
            revision=new_revision,
            change_type="LOCK",
            description=f"Manually locked period '{entry.get('title')}'.",
            before_snapshot=[entry],
            after_snapshot=[dict(entry, isLocked=True, isManuallyLocked=True)],
            affected_entry_ids=[entry_id],
            performed_by=performed_by,
        )

        return {"success": True, "message": "Period locked successfully.", "newRevision": new_revision}

    async def unlock_entry(
        self,
        timetable_id: str,
        entry_id: str,
        performed_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        tt = await timetable_repo.get_by_id(timetable_id)
        if not tt:
            raise NotFoundException("Timetable not found.")
        self._verify_editable(tt)

        entry = await timetable_entry_repo.get_by_id(entry_id)
        if not entry:
            raise NotFoundException(f"Entry '{entry_id}' not found.")

        if entry.get("isFixed"):
            raise ConflictException("System-fixed periods cannot be unlocked. Modify fixed timetable slot configuration to alter them.")

        now = datetime.now(timezone.utc)
        db = timetable_repo.collection.database

        block_id = entry.get("blockId")
        filter_query = {"timetableId": timetable_id, "blockId": block_id} if block_id else {"_id": ObjectId(entry_id)}

        await db.timetable_entries.update_many(
            filter_query,
            {"$set": {
                "isLocked": False,
                "isManuallyLocked": False,
                "lockedAt": None,
                "lockedBy": None,
                "updatedAt": now,
            }},
        )

        new_revision = tt.get("revision", 1) + 1
        await timetable_repo.update_by_id(timetable_id, {"revision": new_revision})

        await timetable_change_history_repo.log_change(
            timetable_id=timetable_id,
            revision=new_revision,
            change_type="UNLOCK",
            description=f"Unlocked period '{entry.get('title')}'.",
            before_snapshot=[entry],
            after_snapshot=[dict(entry, isLocked=False, isManuallyLocked=False)],
            affected_entry_ids=[entry_id],
            performed_by=performed_by,
        )

        return {"success": True, "message": "Period unlocked successfully.", "newRevision": new_revision}

    async def get_history(self, timetable_id: str) -> List[Dict[str, Any]]:
        return await timetable_change_history_repo.get_history(timetable_id)

    async def undo_change(
        self,
        timetable_id: str,
        change_id: str,
        expected_revision: int,
        performed_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        tt = await timetable_repo.get_by_id(timetable_id)
        if not tt:
            raise NotFoundException("Timetable not found.")
        self._verify_editable(tt)
        self._verify_revision(tt, expected_revision)

        change = await timetable_change_history_repo.get_by_id(change_id)
        if not change:
            raise NotFoundException(f"Change history record '{change_id}' not found.")

        if change.get("reverted"):
            raise ConflictException("This change has already been reverted.")

        if change.get("timetableId") != timetable_id:
            raise ConflictException("Change record does not belong to this timetable.")

        change_type = change["changeType"]
        before_snap = change.get("beforeSnapshot", [])
        after_snap = change.get("afterSnapshot", [])
        db = timetable_repo.collection.database
        now = datetime.now(timezone.utc)

        # Revert based on change type
        if change_type in ("MOVE", "SWAP"):
            for e in before_snap:
                await db.timetable_entries.update_one(
                    {"_id": ObjectId(e["id"])},
                    {"$set": {
                        "workingDayId": e["workingDayId"],
                        "timeSlotId": e["timeSlotId"],
                        "updatedAt": now,
                    }},
                )
        elif change_type == "ADD":
            # Delete added entries
            for e in after_snap:
                await db.timetable_entries.delete_one({"_id": ObjectId(e["id"])})
        elif change_type in ("REMOVE", "PARTIAL_REGENERATION"):
            # Delete any current entries from after_snap and restore before_snap
            for e in after_snap:
                eid = e.get("id") or (str(e["_id"]) if "_id" in e else None)
                if eid:
                    await db.timetable_entries.delete_one({"_id": ObjectId(eid)})
            # Re-insert before_snap
            for e in before_snap:
                doc = dict(e)
                doc["_id"] = ObjectId(doc.pop("id", doc.get("_id")))
                doc["updatedAt"] = now
                await db.timetable_entries.insert_one(doc)
        elif change_type in ("LOCK", "UNLOCK"):
            prev_locked = before_snap[0].get("isLocked", False)
            for eid in change.get("affectedEntryIds", []):
                await db.timetable_entries.update_one(
                    {"_id": ObjectId(eid)},
                    {"$set": {
                        "isLocked": prev_locked,
                        "isManuallyLocked": prev_locked,
                        "updatedAt": now,
                    }},
                )

        # Mark reverted
        await timetable_change_history_repo.mark_reverted(change_id)

        # Increment revision & log undo action
        new_revision = tt.get("revision", 1) + 1
        await timetable_repo.update_by_id(timetable_id, {"revision": new_revision})

        await timetable_change_history_repo.log_change(
            timetable_id=timetable_id,
            revision=new_revision,
            change_type=f"UNDO_{change_type}",
            description=f"Reverted change: {change.get('description')}",
            before_snapshot=after_snap,
            after_snapshot=before_snap,
            affected_entry_ids=change.get("affectedEntryIds", []),
            performed_by=performed_by,
        )

        # Post-edit validation
        new_ctx = await timetable_conflict_service.load_context(timetable_id)
        report = timetable_conflict_service.validate_entire_timetable(new_ctx)
        await timetable_repo.update_by_id(timetable_id, {
            "validationStatus": report.status,
            "validationIssues": [i.model_dump() for i in report.issues],
        })

        return {
            "success": True,
            "message": f"Successfully reverted '{change.get('description')}'. Revision updated to {new_revision}.",
            "newRevision": new_revision,
            "validationStatus": report.status,
        }

    async def validate_timetable(self, timetable_id: str) -> TimetableValidationReport:
        ctx = await timetable_conflict_service.load_context(timetable_id)
        report = timetable_conflict_service.validate_entire_timetable(ctx)
        await timetable_repo.update_by_id(timetable_id, {
            "validationStatus": report.status,
            "validationIssues": [i.model_dump() for i in report.issues],
        })
        return report


timetable_edit_service = TimetableEditService()
