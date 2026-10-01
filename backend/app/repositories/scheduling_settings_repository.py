from typing import Any, Dict, Optional
from app.repositories.base_repository import BaseRepository
from app.utils.object_id import doc_to_dict


class SchedulingSettingsRepository(BaseRepository):
    def __init__(self):
        super().__init__("scheduling_settings")

    async def find_by_term(
        self, academic_year_id: str, semester_type_id: str
    ) -> Optional[Dict[str, Any]]:
        query = {
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
        }
        doc = await self.collection.find_one(query)
        return doc_to_dict(doc)

    async def find_current(self) -> Optional[Dict[str, Any]]:
        # Find settings where isActive is True, sorted by updatedAt desc
        cursor = self.collection.find({"isActive": True}).sort("updatedAt", -1).limit(1)
        docs = await cursor.to_list(length=1)
        return doc_to_dict(docs[0]) if docs else None

    async def find_active_current(self) -> Optional[Dict[str, Any]]:
        return await self.find_current()


scheduling_settings_repo = SchedulingSettingsRepository()
