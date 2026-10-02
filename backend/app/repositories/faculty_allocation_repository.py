from typing import Any, Dict, List, Optional
from app.repositories.base_repository import BaseRepository
from app.utils.object_id import docs_to_list


class FacultyAllocationRepository(BaseRepository):
    def __init__(self):
        super().__init__("faculty_subject_allocations")

    def build_query(
        self,
        class_id: Optional[str] = None,
        faculty_id: Optional[str] = None,
        subject_id: Optional[str] = None,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}
        if class_id:
            query["classId"] = class_id
        if faculty_id:
            # facultyIds is an array
            query["facultyIds"] = faculty_id
        if subject_id:
            query["subjectId"] = subject_id
        if academic_year_id:
            query["academicYearId"] = academic_year_id
        if semester_type_id:
            query["semesterTypeId"] = semester_type_id
        if is_active is not None:
            query["isActive"] = is_active
        return query

    async def search_allocations(
        self,
        class_id: Optional[str] = None,
        faculty_id: Optional[str] = None,
        subject_id: Optional[str] = None,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        query = self.build_query(
            class_id, faculty_id, subject_id, academic_year_id, semester_type_id, is_active
        )
        cursor = self.collection.find(query).sort("createdAt", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return docs_to_list(docs)

    async def count_allocations(
        self,
        class_id: Optional[str] = None,
        faculty_id: Optional[str] = None,
        subject_id: Optional[str] = None,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> int:
        query = self.build_query(
            class_id, faculty_id, subject_id, academic_year_id, semester_type_id, is_active
        )
        return await self.collection.count_documents(query)


faculty_allocation_repo = FacultyAllocationRepository()
faculty_allocation_repository = faculty_allocation_repo

