from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from pymongo import DESCENDING
from app.database.mongodb import get_database
from app.repositories.base_repository import BaseRepository
from app.utils.object_id import doc_to_dict, docs_to_list


class TimetableChangeHistoryRepository(BaseRepository):
    def __init__(self):
        super().__init__("timetable_change_history")

    async def log_change(
        self,
        timetable_id: str,
        revision: int,
        change_type: str,
        description: str,
        before_snapshot: List[Dict[str, Any]],
        after_snapshot: List[Dict[str, Any]],
        affected_entry_ids: List[str],
        performed_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc = {
            "_id": ObjectId(),
            "timetableId": timetable_id,
            "revision": revision,
            "changeType": change_type,
            "description": description,
            "beforeSnapshot": before_snapshot,
            "afterSnapshot": after_snapshot,
            "affectedEntryIds": affected_entry_ids,
            "performedAt": now,
            "performedBy": performed_by,
            "reverted": False,
            "revertedAt": None,
            "createdAt": now,
            "updatedAt": now,
            "isActive": True,
        }
        db = get_database()
        await db.timetable_change_history.insert_one(doc)
        return doc_to_dict(doc)

    async def create_change_record(
        self,
        timetable_id: str,
        change_type: str,
        description: str,
        before_snapshot: Any = None,
        after_snapshot: Any = None,
        revision_before: int = 1,
        revision_after: int = 1,
        affected_entry_ids: Optional[List[str]] = None,
        performed_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        before_list = before_snapshot if isinstance(before_snapshot, list) else [before_snapshot] if before_snapshot else []
        after_list = after_snapshot if isinstance(after_snapshot, list) else [after_snapshot] if after_snapshot else []
        return await self.log_change(
            timetable_id=timetable_id,
            revision=revision_after,
            change_type=change_type,
            description=description,
            before_snapshot=before_list,
            after_snapshot=after_list,
            affected_entry_ids=affected_entry_ids or [],
            performed_by=performed_by,
        )

    async def get_history(self, timetable_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        db = get_database()
        cursor = (
            db.timetable_change_history.find({"timetableId": timetable_id})
            .sort("performedAt", DESCENDING)
            .limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return docs_to_list(docs)

    async def get_latest_revertible_change(self, timetable_id: str) -> Optional[Dict[str, Any]]:
        db = get_database()
        cursor = (
            db.timetable_change_history.find({"timetableId": timetable_id, "reverted": False})
            .sort("revision", DESCENDING)
            .limit(1)
        )
        docs = await cursor.to_list(length=1)
        return doc_to_dict(docs[0]) if docs else None

    async def mark_reverted(self, change_id: str) -> bool:
        now = datetime.now(timezone.utc)
        oid = ObjectId(change_id)
        db = get_database()
        res = await db.timetable_change_history.update_one(
            {"_id": oid},
            {"$set": {"reverted": True, "revertedAt": now, "updatedAt": now}},
        )
        return res.modified_count > 0


timetable_change_history_repo = TimetableChangeHistoryRepository()
