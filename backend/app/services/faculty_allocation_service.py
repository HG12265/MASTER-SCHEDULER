from typing import Any, Dict, List, Optional
from app.repositories.faculty_allocation_repository import faculty_allocation_repo
from app.repositories.class_repository import class_repo
from app.repositories.subject_repository import subject_repo
from app.repositories.faculty_repository import faculty_repo
from app.repositories.academic_year_repository import academic_year_repo
from app.repositories.semester_type_repository import semester_type_repo
from app.repositories.resource_repository import resource_repo
from app.schemas.faculty_allocation import FacultyAllocationCreate, FacultyAllocationUpdate
from app.utils.exceptions import BadRequestException, NotFoundException


class FacultyAllocationService:
    async def _validate_allocation_relationships(
        self,
        academic_year_id: str,
        semester_type_id: str,
        class_id: str,
        subject_id: str,
        faculty_ids: List[str],
        preferred_resource_id: Optional[str] = None,
    ) -> None:
        # Validate Academic Year
        ay = await academic_year_repo.get_by_id(academic_year_id)
        if not ay:
            raise NotFoundException(f"Academic year with ID '{academic_year_id}' not found")

        # Validate Semester Type
        st = await semester_type_repo.get_by_id(semester_type_id)
        if not st:
            raise NotFoundException(f"Semester type with ID '{semester_type_id}' not found")

        # Validate Class
        cls_doc = await class_repo.get_by_id(class_id)
        if not cls_doc:
            raise NotFoundException(f"Class with ID '{class_id}' not found")

        # Validate Subject
        subj_doc = await subject_repo.get_by_id(subject_id)
        if not subj_doc:
            raise NotFoundException(f"Subject with ID '{subject_id}' not found")

        # Subject Compatibility Check:
        # Subject must belong to the same Programme and Semester as the selected Class!
        if subj_doc["programmeId"] != cls_doc["programmeId"]:
            raise BadRequestException(
                f"Subject '{subj_doc['name']}' does not belong to the programme of class '{cls_doc['name']}'"
            )

        if subj_doc["semesterId"] != cls_doc["semesterId"]:
            raise BadRequestException(
                f"Subject '{subj_doc['name']}' belongs to a different semester than class '{cls_doc['name']}'"
            )

        # Validate all Faculty IDs
        for f_id in faculty_ids:
            fac = await faculty_repo.get_by_id(f_id)
            if not fac:
                raise NotFoundException(f"Faculty member with ID '{f_id}' not found")

        # Validate Preferred Resource if provided
        if preferred_resource_id:
            res = await resource_repo.get_by_id(preferred_resource_id)
            if not res:
                raise NotFoundException(f"Resource with ID '{preferred_resource_id}' not found")

    async def _enrich_allocation(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        if not doc:
            return doc

        cls_doc = await class_repo.get_by_id(doc["classId"])
        subj_doc = await subject_repo.get_by_id(doc["subjectId"])
        ay = await academic_year_repo.get_by_id(doc["academicYearId"])
        st = await semester_type_repo.get_by_id(doc["semesterTypeId"])

        faculty_names = []
        for fid in doc.get("facultyIds", []):
            fac = await faculty_repo.get_by_id(fid)
            if fac:
                faculty_names.append(fac.get("name"))

        doc["className"] = cls_doc.get("displayName") or cls_doc.get("name") if cls_doc else None
        doc["subjectName"] = subj_doc.get("name") if subj_doc else None
        doc["subjectCode"] = subj_doc.get("subjectCode") if subj_doc else None
        doc["academicYearName"] = ay.get("name") if ay else None
        doc["semesterTypeName"] = st.get("name") if st else None
        doc["facultyNames"] = faculty_names

        if doc.get("preferredResourceId"):
            res = await resource_repo.get_by_id(doc["preferredResourceId"])
            doc["preferredResourceName"] = res.get("name") if res else None
        else:
            doc["preferredResourceName"] = None

        return doc

    async def create(self, data: FacultyAllocationCreate) -> Dict[str, Any]:
        await self._validate_allocation_relationships(
            data.academicYearId,
            data.semesterTypeId,
            data.classId,
            data.subjectId,
            data.facultyIds,
            data.preferredResourceId,
        )

        doc = await faculty_allocation_repo.create(data.model_dump())
        return await self._enrich_allocation(doc)

    async def get_by_id(self, id_str: str) -> Dict[str, Any]:
        record = await faculty_allocation_repo.get_by_id(id_str)
        if not record:
            raise NotFoundException(f"Faculty allocation with ID '{id_str}' not found")
        return await self._enrich_allocation(record)

    async def list_allocations(
        self,
        class_id: Optional[str] = None,
        faculty_id: Optional[str] = None,
        subject_id: Optional[str] = None,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        page: int = 1,
        limit: int = 10,
    ) -> Dict[str, Any]:
        skip = (page - 1) * limit
        items = await faculty_allocation_repo.search_allocations(
            class_id, faculty_id, subject_id, academic_year_id, semester_type_id, is_active, skip, limit
        )
        total = await faculty_allocation_repo.count_allocations(
            class_id, faculty_id, subject_id, academic_year_id, semester_type_id, is_active
        )
        total_pages = (total + limit - 1) // limit if limit > 0 else 1

        enriched_items = [await self._enrich_allocation(item) for item in items]

        return {
            "items": enriched_items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
            },
        }

    async def update(self, id_str: str, data: FacultyAllocationUpdate) -> Dict[str, Any]:
        record = await self.get_by_id(id_str)
        update_dict = data.model_dump(exclude_unset=True)

        ay_id = update_dict.get("academicYearId", record["academicYearId"])
        st_id = update_dict.get("semesterTypeId", record["semesterTypeId"])
        cls_id = update_dict.get("classId", record["classId"])
        subj_id = update_dict.get("subjectId", record["subjectId"])
        fac_ids = update_dict.get("facultyIds", record["facultyIds"])
        res_id = update_dict.get("preferredResourceId", record.get("preferredResourceId"))

        await self._validate_allocation_relationships(
            ay_id, st_id, cls_id, subj_id, fac_ids, res_id
        )

        updated = await faculty_allocation_repo.update_by_id(id_str, update_dict)
        return await self._enrich_allocation(updated)

    async def delete(self, id_str: str) -> bool:
        await self.get_by_id(id_str)
        return await faculty_allocation_repo.delete_by_id(id_str)


faculty_allocation_service = FacultyAllocationService()
