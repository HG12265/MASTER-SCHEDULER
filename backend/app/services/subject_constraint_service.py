from typing import Any, Dict, List, Optional
from app.repositories.subject_constraint_repository import subject_constraint_repo
from app.repositories.academic_year_repository import academic_year_repo
from app.repositories.semester_type_repository import semester_type_repo
from app.repositories.class_repository import class_repo
from app.repositories.subject_repository import subject_repo
from app.repositories.time_slot_repository import time_slot_repo
from app.repositories.working_day_repository import working_day_repo
from app.schemas.subject_constraint import SubjectConstraintCreate, SubjectConstraintUpdate
from app.utils.exceptions import BadRequestException, ConflictException, NotFoundException


class SubjectConstraintService:
    async def _validate_references(
        self,
        academic_year_id: str,
        semester_type_id: str,
        class_id: str,
        subject_id: str,
        preferred_time_slot_ids: Optional[List[str]] = None,
        avoid_time_slot_ids: Optional[List[str]] = None,
        preferred_working_day_ids: Optional[List[str]] = None,
        avoid_working_day_ids: Optional[List[str]] = None,
    ) -> None:
        if not await academic_year_repo.get_by_id(academic_year_id):
            raise NotFoundException(f"Academic year with ID '{academic_year_id}' not found")
        if not await semester_type_repo.get_by_id(semester_type_id):
            raise NotFoundException(f"Semester type with ID '{semester_type_id}' not found")

        cls_doc = await class_repo.get_by_id(class_id)
        if not cls_doc:
            raise NotFoundException(f"Class with ID '{class_id}' not found")

        subj_doc = await subject_repo.get_by_id(subject_id)
        if not subj_doc:
            raise NotFoundException(f"Subject with ID '{subject_id}' not found")

        if subj_doc.get("programmeId") != cls_doc.get("programmeId"):
            raise BadRequestException(f"Subject '{subj_doc.get('name')}' does not match class programme")

        for s_id in (preferred_time_slot_ids or []):
            if not await time_slot_repo.get_by_id(s_id):
                raise NotFoundException(f"Time slot with ID '{s_id}' not found")

        for s_id in (avoid_time_slot_ids or []):
            if not await time_slot_repo.get_by_id(s_id):
                raise NotFoundException(f"Time slot with ID '{s_id}' not found")

        for d_id in (preferred_working_day_ids or []):
            if not await working_day_repo.get_by_id(d_id):
                raise NotFoundException(f"Working day with ID '{d_id}' not found")

        for d_id in (avoid_working_day_ids or []):
            if not await working_day_repo.get_by_id(d_id):
                raise NotFoundException(f"Working day with ID '{d_id}' not found")

    async def _enrich_doc(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        result = dict(doc)
        cls_doc = await class_repo.get_by_id(doc["classId"])
        if cls_doc:
            result["className"] = cls_doc.get("name")

        subj = await subject_repo.get_by_id(doc["subjectId"])
        if subj:
            result["subjectName"] = subj.get("name")
            result["subjectCode"] = subj.get("subjectCode")
            result["subjectType"] = subj.get("subjectType")

        ay = await academic_year_repo.get_by_id(doc["academicYearId"])
        if ay:
            result["academicYearName"] = ay.get("name")

        st = await semester_type_repo.get_by_id(doc["semesterTypeId"])
        if st:
            result["semesterTypeName"] = st.get("name")

        return result

    async def create(self, data: SubjectConstraintCreate) -> Dict[str, Any]:
        await self._validate_references(
            data.academicYearId,
            data.semesterTypeId,
            data.classId,
            data.subjectId,
            data.preferredTimeSlotIds,
            data.avoidTimeSlotIds,
            data.preferredWorkingDayIds,
            data.avoidWorkingDayIds,
        )

        existing = await subject_constraint_repo.find_by_class_and_subject(
            data.academicYearId, data.semesterTypeId, data.classId, data.subjectId
        )
        if existing:
            raise ConflictException(
                "A preference configuration already exists for this subject and class combination"
            )

        doc = await subject_constraint_repo.create(data.model_dump())
        return await self._enrich_doc(doc)

    async def get_by_id(self, id_str: str) -> Dict[str, Any]:
        doc = await subject_constraint_repo.get_by_id(id_str)
        if not doc:
            raise NotFoundException(f"Subject constraint profile with ID '{id_str}' not found")
        return await self._enrich_doc(doc)

    async def list_constraints(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        class_id: Optional[str] = None,
        subject_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 0,
    ) -> List[Dict[str, Any]]:
        docs = await subject_constraint_repo.search_constraints(
            academic_year_id, semester_type_id, class_id, subject_id, is_active, skip, limit
        )
        return [await self._enrich_doc(d) for d in docs]

    async def update(self, id_str: str, data: SubjectConstraintUpdate) -> Dict[str, Any]:
        existing = await subject_constraint_repo.get_by_id(id_str)
        if not existing:
            raise NotFoundException(f"Subject constraint profile with ID '{id_str}' not found")

        update_fields = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
        doc = await subject_constraint_repo.update_by_id(id_str, update_fields)
        return await self._enrich_doc(doc)

    async def delete(self, id_str: str) -> bool:
        if not await subject_constraint_repo.get_by_id(id_str):
            raise NotFoundException(f"Subject constraint profile with ID '{id_str}' not found")
        return await subject_constraint_repo.delete_by_id(id_str)


subject_constraint_service = SubjectConstraintService()
