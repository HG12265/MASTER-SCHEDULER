from typing import Any, Dict, List, Optional
from app.repositories.faculty_constraint_repository import faculty_constraint_repo
from app.repositories.academic_year_repository import academic_year_repo
from app.repositories.semester_type_repository import semester_type_repo
from app.repositories.faculty_repository import faculty_repo
from app.schemas.faculty_constraint import FacultyConstraintCreate, FacultyConstraintUpdate
from app.utils.exceptions import ConflictException, NotFoundException


class FacultyConstraintService:
    async def _validate_references(
        self,
        academic_year_id: str,
        semester_type_id: str,
        faculty_id: str,
    ) -> None:
        if not await academic_year_repo.get_by_id(academic_year_id):
            raise NotFoundException(f"Academic year with ID '{academic_year_id}' not found")
        if not await semester_type_repo.get_by_id(semester_type_id):
            raise NotFoundException(f"Semester type with ID '{semester_type_id}' not found")
        if not await faculty_repo.get_by_id(faculty_id):
            raise NotFoundException(f"Faculty member with ID '{faculty_id}' not found")

    async def _enrich_doc(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        result = dict(doc)
        fac = await faculty_repo.get_by_id(doc["facultyId"])
        if fac:
            result["facultyName"] = fac.get("name")
            result["facultyCode"] = fac.get("facultyCode")
            result["maxHoursPerWeek"] = fac.get("maxHoursPerWeek")
            result["maxHoursPerDay"] = fac.get("maxHoursPerDay")
            result["maxConsecutiveHours"] = fac.get("maxConsecutiveHours")

        ay = await academic_year_repo.get_by_id(doc["academicYearId"])
        if ay:
            result["academicYearName"] = ay.get("name")

        st = await semester_type_repo.get_by_id(doc["semesterTypeId"])
        if st:
            result["semesterTypeName"] = st.get("name")

        return result

    async def create(self, data: FacultyConstraintCreate) -> Dict[str, Any]:
        await self._validate_references(
            data.academicYearId,
            data.semesterTypeId,
            data.facultyId,
        )

        existing = await faculty_constraint_repo.find_by_faculty(
            data.academicYearId, data.semesterTypeId, data.facultyId
        )
        if existing:
            raise ConflictException("A scheduling preference profile already exists for this faculty member in this term")

        doc = await faculty_constraint_repo.create(data.model_dump())
        return await self._enrich_doc(doc)

    async def get_by_id(self, id_str: str) -> Dict[str, Any]:
        doc = await faculty_constraint_repo.get_by_id(id_str)
        if not doc:
            raise NotFoundException(f"Faculty constraint profile with ID '{id_str}' not found")
        return await self._enrich_doc(doc)

    async def list_constraints(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        faculty_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 0,
    ) -> List[Dict[str, Any]]:
        docs = await faculty_constraint_repo.search_constraints(
            academic_year_id, semester_type_id, faculty_id, is_active, skip, limit
        )
        return [await self._enrich_doc(d) for d in docs]

    async def update(self, id_str: str, data: FacultyConstraintUpdate) -> Dict[str, Any]:
        existing = await faculty_constraint_repo.get_by_id(id_str)
        if not existing:
            raise NotFoundException(f"Faculty constraint profile with ID '{id_str}' not found")

        update_fields = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
        doc = await faculty_constraint_repo.update_by_id(id_str, update_fields)
        return await self._enrich_doc(doc)

    async def delete(self, id_str: str) -> bool:
        if not await faculty_constraint_repo.get_by_id(id_str):
            raise NotFoundException(f"Faculty constraint profile with ID '{id_str}' not found")
        return await faculty_constraint_repo.delete_by_id(id_str)


faculty_constraint_service = FacultyConstraintService()
