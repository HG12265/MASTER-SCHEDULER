from typing import Any, Dict, List, Optional
from app.repositories.class_repository import class_repo
from app.repositories.programme_repository import programme_repo
from app.repositories.semester_repository import semester_repo
from app.repositories.academic_year_repository import academic_year_repo
from app.repositories.semester_type_repository import semester_type_repo
from app.repositories.faculty_allocation_repository import faculty_allocation_repo
from app.schemas.class_model import ClassCreate, ClassUpdate
from app.utils.exceptions import BadRequestException, ConflictException, DependencyException, NotFoundException


class ClassService:
    async def _validate_relationships(
        self, programme_id: str, semester_id: str, academic_year_id: str, semester_type_id: str
    ) -> None:
        prog = await programme_repo.get_by_id(programme_id)
        if not prog:
            raise NotFoundException(f"Programme with ID '{programme_id}' not found")

        sem = await semester_repo.get_by_id(semester_id)
        if not sem:
            raise NotFoundException(f"Semester with ID '{semester_id}' not found")

        if sem["programmeId"] != programme_id:
            raise BadRequestException(
                f"Selected semester '{sem['name']}' does not belong to programme '{prog['name']}'"
            )

        ay = await academic_year_repo.get_by_id(academic_year_id)
        if not ay:
            raise NotFoundException(f"Academic year with ID '{academic_year_id}' not found")

        st = await semester_type_repo.get_by_id(semester_type_id)
        if not st:
            raise NotFoundException(f"Semester type with ID '{semester_type_id}' not found")

    async def _enrich_class(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        if not doc:
            return doc
        p = await programme_repo.get_by_id(doc["programmeId"])
        s = await semester_repo.get_by_id(doc["semesterId"])
        ay = await academic_year_repo.get_by_id(doc["academicYearId"])
        st = await semester_type_repo.get_by_id(doc["semesterTypeId"])

        doc["programmeName"] = p.get("name") if p else None
        doc["semesterName"] = s.get("name") if s else None
        doc["academicYearName"] = ay.get("name") if ay else None
        doc["semesterTypeName"] = st.get("name") if st else None
        return doc

    async def create(self, data: ClassCreate) -> Dict[str, Any]:
        await self._validate_relationships(
            data.programmeId, data.semesterId, data.academicYearId, data.semesterTypeId
        )

        # Compound uniqueness check
        duplicate = await class_repo.find_duplicate(
            data.academicYearId,
            data.semesterTypeId,
            data.programmeId,
            data.semesterId,
            data.section,
        )
        if duplicate:
            sec_text = f" Section {data.section}" if data.section else ""
            raise ConflictException(
                f"Class for this Programme, Semester, Academic Year, and Semester Type{sec_text} already exists"
            )

        doc = await class_repo.create(data.model_dump())
        return await self._enrich_class(doc)

    async def get_by_id(self, id_str: str) -> Dict[str, Any]:
        record = await class_repo.get_by_id(id_str)
        if not record:
            raise NotFoundException(f"Class with ID '{id_str}' not found")
        return await self._enrich_class(record)

    async def list_classes(
        self,
        programme_id: Optional[str] = None,
        semester_id: Optional[str] = None,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 10,
    ) -> Dict[str, Any]:
        skip = (page - 1) * limit
        items = await class_repo.search_classes(
            programme_id, semester_id, academic_year_id, semester_type_id, is_active, search, skip, limit
        )
        total = await class_repo.count_classes(
            programme_id, semester_id, academic_year_id, semester_type_id, is_active, search
        )
        total_pages = (total + limit - 1) // limit if limit > 0 else 1

        enriched_items = [await self._enrich_class(item) for item in items]

        return {
            "items": enriched_items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
            },
        }

    async def update(self, id_str: str, data: ClassUpdate) -> Dict[str, Any]:
        record = await self.get_by_id(id_str)
        update_dict = data.model_dump(exclude_unset=True)

        prog_id = update_dict.get("programmeId", record["programmeId"])
        sem_id = update_dict.get("semesterId", record["semesterId"])
        ay_id = update_dict.get("academicYearId", record["academicYearId"])
        st_id = update_dict.get("semesterTypeId", record["semesterTypeId"])
        section = update_dict.get("section", record.get("section"))

        if any(k in update_dict for k in ("programmeId", "semesterId", "academicYearId", "semesterTypeId")):
            await self._validate_relationships(prog_id, sem_id, ay_id, st_id)

        # Compound duplicate check if key fields changed
        duplicate = await class_repo.find_duplicate(
            ay_id, st_id, prog_id, sem_id, section, exclude_id=id_str
        )
        if duplicate and duplicate["id"] != id_str:
            raise ConflictException(
                "Another class already exists with the same Academic Year, Term, Programme, Semester, and Section"
            )

        updated = await class_repo.update_by_id(id_str, update_dict)
        return await self._enrich_class(updated)

    async def delete(self, id_str: str) -> bool:
        await self.get_by_id(id_str)

        # Referential dependency check
        alloc_count = await faculty_allocation_repo.count({"classId": id_str})
        if alloc_count > 0:
            raise DependencyException(
                f"Class cannot be deleted because it has {alloc_count} active faculty subject allocation(s)."
            )

        return await class_repo.delete_by_id(id_str)


class_service = ClassService()
