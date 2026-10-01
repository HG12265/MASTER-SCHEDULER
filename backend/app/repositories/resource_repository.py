import re
from typing import Any, Dict, List, Optional
from app.repositories.base_repository import BaseRepository
from app.utils.object_id import docs_to_list


class ResourceRepository(BaseRepository):
    def __init__(self):
        super().__init__("resources")

    async def find_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"code": code.upper()})

    def build_query(
        self,
        resource_type: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}
        if resource_type:
            query["resourceType"] = resource_type.upper()
        if is_active is not None:
            query["isActive"] = is_active
        if search and search.strip():
            safe_term = re.escape(search.strip())
            regex_pat = {"$regex": safe_term, "$options": "i"}
            query["$or"] = [
                {"name": regex_pat},
                {"code": regex_pat},
                {"location": regex_pat},
            ]
        return query

    async def search_resources(
        self,
        resource_type: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        query = self.build_query(resource_type, is_active, search)
        cursor = self.collection.find(query).sort("name", 1).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return docs_to_list(docs)

    async def count_resources(
        self,
        resource_type: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> int:
        query = self.build_query(resource_type, is_active, search)
        return await self.collection.count_documents(query)


resource_repo = ResourceRepository()
