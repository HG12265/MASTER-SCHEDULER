from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.repositories.base_repository import BaseRepository
from app.utils.object_id import doc_to_dict


class ExportHistoryRepository(BaseRepository):
    def __init__(self):
        super().__init__("export_history")

    async def log_export(
        self,
        timetable_id: str,
        export_type: str,
        view_type: str,
        filename: str,
        class_id: Optional[str] = None,
        faculty_id: Optional[str] = None,
        report_type: Optional[str] = None,
        file_size_bytes: Optional[int] = None,
        generated_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        record = {
            "timetableId": timetable_id,
            "exportType": export_type,
            "viewType": view_type,
            "filename": filename,
            "classId": class_id,
            "facultyId": faculty_id,
            "reportType": report_type,
            "fileSizeBytes": file_size_bytes,
            "generatedAt": now,
            "generatedBy": generated_by or "Administrator",
            "createdAt": now,
            "updatedAt": now,
            "isActive": True,
        }
        res = await self.collection.insert_one(record)
        record["_id"] = res.inserted_id
        return doc_to_dict(record)

    async def get_history_by_timetable(self, timetable_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"timetableId": timetable_id}).sort("generatedAt", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        from app.utils.object_id import docs_to_list
        return docs_to_list(docs)


export_history_repo = ExportHistoryRepository()
