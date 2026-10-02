import re
from typing import Any, Dict, List, Optional
from app.repositories.base_repository import BaseRepository
from app.utils.object_id import docs_to_list


class FacultyRepository(BaseRepository):
    def __init__(self):
        super().__init__("faculty")

    async def find_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"facultyCode": code.upper()})

    async def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"email": email.lower()})

    def build_query(
        self, search: Optional[str] = None, is_active: Optional[bool] = None
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}
        if is_active is not None:
            query["isActive"] = is_active
        if search and search.strip():
            safe_term = re.escape(search.strip())
            regex_pat = {"$regex": safe_term, "$options": "i"}
            query["$or"] = [
                {"name": regex_pat},
                {"facultyCode": regex_pat},
                {"designation": regex_pat},
                {"email": regex_pat},
            ]
        return query

    async def search_faculty(
        self,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        query = self.build_query(search, is_active)
        cursor = self.collection.find(query).sort("name", 1).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return docs_to_list(docs)

    async def count_faculty(
        self, search: Optional[str] = None, is_active: Optional[bool] = None
    ) -> int:
        query = self.build_query(search, is_active)
        return await self.collection.count_documents(query)


faculty_repo = FacultyRepository()
faculty_repository = faculty_repo

