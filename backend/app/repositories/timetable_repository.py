from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from pymongo import ASCENDING, DESCENDING
from app.database.mongodb import get_database
from app.repositories.base_repository import BaseRepository
from app.utils.exceptions import NotFoundException


class TimetableRepository(BaseRepository):
    def __init__(self):
        super().__init__("timetables")

    async def get_next_version(self, academic_year_id: str, semester_type_id: str) -> int:
        db = get_database()
        cursor = db.timetables.find(
            {"academicYearId": academic_year_id, "semesterTypeId": semester_type_id}
        ).sort("version", DESCENDING).limit(1)
        results = await cursor.to_list(length=1)
        if results and "version" in results[0]:
            return int(results[0]["version"]) + 1
        return 1

    async def archive_drafts(self, academic_year_id: str, semester_type_id: str) -> int:
        db = get_database()
        now = datetime.now(timezone.utc)
        res = await db.timetables.update_many(
            {
                "academicYearId": academic_year_id,
                "semesterTypeId": semester_type_id,
                "status": "DRAFT",
            },
            {"$set": {"status": "ARCHIVED", "updatedAt": now}},
        )
        return res.modified_count


class TimetableEntryRepository(BaseRepository):
    def __init__(self):
        super().__init__("timetable_entries")

    async def insert_many_entries(self, entries: List[Dict[str, Any]]) -> List[str]:
        if not entries:
            return []
        db = get_database()
        now = datetime.now(timezone.utc)
        docs = []
        for e in entries:
            doc = dict(e)
            doc["_id"] = ObjectId()
            doc["createdAt"] = now
            doc["updatedAt"] = now
            doc.setdefault("isActive", True)
            docs.append(doc)

        await db.timetable_entries.insert_many(docs)
        return [str(d["_id"]) for d in docs]

    async def find_entries(
        self,
        timetable_id: str,
        class_id: Optional[str] = None,
        faculty_id: Optional[str] = None,
        working_day_id: Optional[str] = None,
        time_slot_id: Optional[str] = None,
        subject_id: Optional[str] = None,
        resource_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        filter_dict: Dict[str, Any] = {"timetableId": timetable_id, "isActive": True}
        if class_id:
            filter_dict["classId"] = class_id
        if faculty_id:
            filter_dict["facultyIds"] = faculty_id
        if working_day_id:
            filter_dict["workingDayId"] = working_day_id
        if time_slot_id:
            filter_dict["timeSlotId"] = time_slot_id
        if subject_id:
            filter_dict["subjectId"] = subject_id
        if resource_id:
            filter_dict["resourceId"] = resource_id

        return await self.find_many(filter_dict)

    async def delete_by_timetable_id(self, timetable_id: str) -> int:
        db = get_database()
        res = await db.timetable_entries.delete_many({"timetableId": timetable_id})
        return res.deleted_count


timetable_repo = TimetableRepository()
timetable_entry_repo = TimetableEntryRepository()
