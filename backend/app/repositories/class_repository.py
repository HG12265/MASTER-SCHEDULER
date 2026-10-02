import re
from typing import Any, Dict, List, Optional
from app.repositories.base_repository import BaseRepository
from app.utils.object_id import parse_object_id, docs_to_list


class ClassRepository(BaseRepository):
    def __init__(self):
        super().__init__("classes")

    async def find_duplicate(
        self,
        academic_year_id: str,
        semester_type_id: str,
        programme_id: str,
        semester_id: str,
        section: Optional[str] = None,
        exclude_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        query: Dict[str, Any] = {
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
            "programmeId": programme_id,
            "semesterId": semester_id,
            "section": section,
        }
        if exclude_id:
            query["_id"] = {"$ne": parse_object_id(exclude_id, "Class")}
        return await self.find_one(query)

    def build_query(
        self,
        programme_id: Optional[str] = None,
        semester_id: Optional[str] = None,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}
        if programme_id:
            query["programmeId"] = programme_id
        if semester_id:
            query["semesterId"] = semester_id
        if academic_year_id:
            query["academicYearId"] = academic_year_id
        if semester_type_id:
            query["semesterTypeId"] = semester_type_id
        if is_active is not None:
            query["isActive"] = is_active
        if search and search.strip():
            safe_term = re.escape(search.strip())
            regex_pat = {"$regex": safe_term, "$options": "i"}
            query["$or"] = [
                {"name": regex_pat},
                {"displayName": regex_pat},
            ]
        return query

    async def search_classes(
        self,
        programme_id: Optional[str] = None,
        semester_id: Optional[str] = None,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        query = self.build_query(
            programme_id, semester_id, academic_year_id, semester_type_id, is_active, search
        )
        cursor = self.collection.find(query).sort("name", 1).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return docs_to_list(docs)

    async def count_classes(
        self,
        programme_id: Optional[str] = None,
        semester_id: Optional[str] = None,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> int:
        query = self.build_query(
            programme_id, semester_id, academic_year_id, semester_type_id, is_active, search
        )
        return await self.collection.count_documents(query)


class_repo = ClassRepository()
class_repository = class_repo

