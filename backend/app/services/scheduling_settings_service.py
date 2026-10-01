from typing import Any, Dict, List, Optional
from app.repositories.scheduling_settings_repository import scheduling_settings_repo
from app.repositories.academic_year_repository import academic_year_repo
from app.repositories.semester_type_repository import semester_type_repo
from app.schemas.scheduling_settings import (
    SchedulingSettingsCreate,
    SchedulingSettingsUpdate,
    DEFAULT_SOFT_WEIGHTS,
)
from app.utils.exceptions import ConflictException, NotFoundException


class SchedulingSettingsService:
    async def _enrich_doc(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        result = dict(doc)
        ay = await academic_year_repo.get_by_id(doc["academicYearId"])
        if ay:
            result["academicYearName"] = ay.get("name")

        st = await semester_type_repo.get_by_id(doc["semesterTypeId"])
        if st:
            result["semesterTypeName"] = st.get("name")

        return result

    async def get_by_id(self, id_str: str) -> Dict[str, Any]:
        doc = await scheduling_settings_repo.get_by_id(id_str)
        if not doc:
            raise NotFoundException(f"Scheduling settings with ID '{id_str}' not found")
        return await self._enrich_doc(doc)

    async def get_by_term(
        self, academic_year_id: str, semester_type_id: str
    ) -> Optional[Dict[str, Any]]:
        doc = await scheduling_settings_repo.find_by_term(academic_year_id, semester_type_id)
        if doc:
            return await self._enrich_doc(doc)
        return None

    async def get_current(self) -> Dict[str, Any]:
        doc = await scheduling_settings_repo.find_current()
        if doc:
            return await self._enrich_doc(doc)

        # Fallback to current academic year
        curr_ay = await academic_year_repo.get_current()
        first_st = (await semester_type_repo.find_many(limit=1))
        st_id = first_st[0]["id"] if first_st else "default_st"
        ay_id = curr_ay["id"] if curr_ay else "default_ay"

        default_settings = {
            "id": "default",
            "academicYearId": ay_id,
            "semesterTypeId": st_id,
            "maxFacultyHoursPerDay": 4,
            "maxFacultyConsecutiveHours": 2,
            "maxClassConsecutiveHours": 3,
            "avoidSameSubjectMultipleTimesPerDay": True,
            "distributeSubjectsAcrossWeek": True,
            "balanceFacultyDailyLoad": True,
            "preferLabsInBlocks": True,
            "avoidFirstPeriodForFaculty": False,
            "avoidLastPeriodForFaculty": False,
            "allowFreePeriodsForClasses": True,
            "allowUnassignedSlots": False,
            "softConstraintWeights": dict(DEFAULT_SOFT_WEIGHTS),
            "isActive": True,
            "academicYearName": curr_ay.get("name") if curr_ay else "Default Year",
            "semesterTypeName": first_st[0].get("name") if first_st else "Default Term",
        }
        return default_settings

    async def list_settings(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> List[Dict[str, Any]]:
        query = {}
        if academic_year_id:
            query["academicYearId"] = academic_year_id
        if semester_type_id:
            query["semesterTypeId"] = semester_type_id
        if is_active is not None:
            query["isActive"] = is_active

        docs = await scheduling_settings_repo.find_many(query)
        return [await self._enrich_doc(d) for d in docs]

    async def create(self, data: SchedulingSettingsCreate) -> Dict[str, Any]:
        if not await academic_year_repo.get_by_id(data.academicYearId):
            raise NotFoundException(f"Academic year with ID '{data.academicYearId}' not found")
        if not await semester_type_repo.get_by_id(data.semesterTypeId):
            raise NotFoundException(f"Semester type with ID '{data.semesterTypeId}' not found")

        existing = await scheduling_settings_repo.find_by_term(data.academicYearId, data.semesterTypeId)
        if existing:
            raise ConflictException(
                "Scheduling settings already exist for this academic year and semester type. Use PUT /api/scheduling-settings/{id} to update."
            )

        doc = await scheduling_settings_repo.create(data.model_dump())
        return await self._enrich_doc(doc)

    async def update(self, id_str: str, data: SchedulingSettingsUpdate) -> Dict[str, Any]:
        existing = await scheduling_settings_repo.get_by_id(id_str)
        if not existing:
            raise NotFoundException(f"Scheduling settings with ID '{id_str}' not found")

        update_fields = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
        doc = await scheduling_settings_repo.update_by_id(id_str, update_fields)
        return await self._enrich_doc(doc)


scheduling_settings_service = SchedulingSettingsService()
