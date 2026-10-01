from typing import Any, Dict, List, Optional
from app.repositories.class_constraint_repository import class_constraint_repo
from app.repositories.academic_year_repository import academic_year_repo
from app.repositories.semester_type_repository import semester_type_repo
from app.repositories.class_repository import class_repo
from app.repositories.time_slot_repository import time_slot_repo
from app.schemas.class_constraint import ClassConstraintCreate, ClassConstraintUpdate
from app.utils.exceptions import BadRequestException, ConflictException, NotFoundException


class ClassConstraintService:
    async def _validate_references(
        self,
        academic_year_id: str,
        semester_type_id: str,
        class_id: str,
        preferred_free_slot_ids: Optional[List[str]] = None,
        blocked_slot_ids: Optional[List[str]] = None,
    ) -> None:
        if not await academic_year_repo.get_by_id(academic_year_id):
            raise NotFoundException(f"Academic year with ID '{academic_year_id}' not found")
        if not await semester_type_repo.get_by_id(semester_type_id):
            raise NotFoundException(f"Semester type with ID '{semester_type_id}' not found")

        cls_doc = await class_repo.get_by_id(class_id)
        if not cls_doc:
            raise NotFoundException(f"Class with ID '{class_id}' not found")

        if cls_doc.get("academicYearId") != academic_year_id:
            raise BadRequestException("Class does not belong to the selected academic year")
        if cls_doc.get("semesterTypeId") != semester_type_id:
            raise BadRequestException("Class does not belong to the selected semester type")

        for s_id in (preferred_free_slot_ids or []):
            ts = await time_slot_repo.get_by_id(s_id)
            if not ts:
                raise NotFoundException(f"Time slot with ID '{s_id}' not found")

        for s_id in (blocked_slot_ids or []):
            ts = await time_slot_repo.get_by_id(s_id)
            if not ts:
                raise NotFoundException(f"Time slot with ID '{s_id}' not found")
            if not ts.get("isTeachingSlot", True):
                raise BadRequestException(f"Time slot '{ts.get('name')}' is already a non-teaching slot")

    async def _enrich_doc(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        result = dict(doc)
        cls_doc = await class_repo.get_by_id(doc["classId"])
        if cls_doc:
            result["className"] = cls_doc.get("name")
            result["classDisplayName"] = cls_doc.get("displayName")

        ay = await academic_year_repo.get_by_id(doc["academicYearId"])
        if ay:
            result["academicYearName"] = ay.get("name")

        st = await semester_type_repo.get_by_id(doc["semesterTypeId"])
        if st:
            result["semesterTypeName"] = st.get("name")

        return result

    async def create(self, data: ClassConstraintCreate) -> Dict[str, Any]:
        await self._validate_references(
            data.academicYearId,
            data.semesterTypeId,
            data.classId,
            data.preferredFreeSlotIds,
            data.blockedSlotIds,
        )

        existing = await class_constraint_repo.find_by_class(
            data.academicYearId, data.semesterTypeId, data.classId
        )
        if existing:
            raise ConflictException("A constraint profile already exists for this class in this term")

        doc = await class_constraint_repo.create(data.model_dump())
        return await self._enrich_doc(doc)

    async def get_by_id(self, id_str: str) -> Dict[str, Any]:
        doc = await class_constraint_repo.get_by_id(id_str)
        if not doc:
            raise NotFoundException(f"Class constraint profile with ID '{id_str}' not found")
        return await self._enrich_doc(doc)

    async def list_constraints(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        class_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 0,
    ) -> List[Dict[str, Any]]:
        docs = await class_constraint_repo.search_constraints(
            academic_year_id, semester_type_id, class_id, is_active, skip, limit
        )
        return [await self._enrich_doc(d) for d in docs]

    async def update(self, id_str: str, data: ClassConstraintUpdate) -> Dict[str, Any]:
        existing = await class_constraint_repo.get_by_id(id_str)
        if not existing:
            raise NotFoundException(f"Class constraint profile with ID '{id_str}' not found")

        update_fields = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
        doc = await class_constraint_repo.update_by_id(id_str, update_fields)
        return await self._enrich_doc(doc)

    async def delete(self, id_str: str) -> bool:
        if not await class_constraint_repo.get_by_id(id_str):
            raise NotFoundException(f"Class constraint profile with ID '{id_str}' not found")
        return await class_constraint_repo.delete_by_id(id_str)


class_constraint_service = ClassConstraintService()
