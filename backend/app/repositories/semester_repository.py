from typing import Any, Dict, List, Optional
from app.repositories.base_repository import BaseRepository
from app.utils.object_id import docs_to_list


class SemesterRepository(BaseRepository):
    def __init__(self):
        super().__init__("semesters")

    async def find_by_programme_and_number(
        self, programme_id: str, semester_number: int
    ) -> Optional[Dict[str, Any]]:
        return await self.find_one({
            "programmeId": programme_id,
            "semesterNumber": semester_number,
        })

    async def find_by_programme(
        self, programme_id: str, is_active: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"programmeId": programme_id}
        if is_active is not None:
            query["isActive"] = is_active
        cursor = self.collection.find(query).sort("semesterNumber", 1)
        docs = await cursor.to_list(length=100)
        return docs_to_list(docs)

    async def list_semesters(
        self,
        programme_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if programme_id:
            query["programmeId"] = programme_id
        if is_active is not None:
            query["isActive"] = is_active
        cursor = self.collection.find(query).sort([
            ("programmeId", 1),
            ("semesterNumber", 1)
        ]).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return docs_to_list(docs)


semester_repo = SemesterRepository()
