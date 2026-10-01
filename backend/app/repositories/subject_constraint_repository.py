from typing import Any, Dict, List, Optional
from app.repositories.base_repository import BaseRepository
from app.utils.object_id import docs_to_list, doc_to_dict


class SubjectConstraintRepository(BaseRepository):
    def __init__(self):
        super().__init__("subject_constraints")

    def build_query(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        class_id: Optional[str] = None,
        subject_id: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}
        if academic_year_id:
            query["academicYearId"] = academic_year_id
        if semester_type_id:
            query["semesterTypeId"] = semester_type_id
        if class_id:
            query["classId"] = class_id
        if subject_id:
            query["subjectId"] = subject_id
        if is_active is not None:
            query["isActive"] = is_active
        return query

    async def search_constraints(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        class_id: Optional[str] = None,
        subject_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 0,
    ) -> List[Dict[str, Any]]:
        query = self.build_query(academic_year_id, semester_type_id, class_id, subject_id, is_active)
        cursor = self.collection.find(query).sort("createdAt", -1)
        if skip > 0:
            cursor = cursor.skip(skip)
        if limit > 0:
            cursor = cursor.limit(limit)
        docs = await cursor.to_list(length=limit if limit > 0 else 1000)
        return docs_to_list(docs)

    async def count_constraints(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        class_id: Optional[str] = None,
        subject_id: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> int:
        query = self.build_query(academic_year_id, semester_type_id, class_id, subject_id, is_active)
        return await self.collection.count_documents(query)

    async def find_by_class_and_subject(
        self, academic_year_id: str, semester_type_id: str, class_id: str, subject_id: str
    ) -> Optional[Dict[str, Any]]:
        query = {
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
            "classId": class_id,
            "subjectId": subject_id,
        }
        doc = await self.collection.find_one(query)
        return doc_to_dict(doc)


subject_constraint_repo = SubjectConstraintRepository()
