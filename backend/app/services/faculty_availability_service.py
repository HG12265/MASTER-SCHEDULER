from typing import Any, Dict, List, Optional
from app.repositories.faculty_availability_repository import faculty_availability_repo
from app.repositories.academic_year_repository import academic_year_repo
from app.repositories.semester_type_repository import semester_type_repo
from app.repositories.faculty_repository import faculty_repo
from app.repositories.working_day_repository import working_day_repo
from app.repositories.time_slot_repository import time_slot_repo
from app.schemas.faculty_availability import (
    FacultyAvailabilityCreate,
    FacultyAvailabilityUpdate,
    FacultyAvailabilityBulkUpdate,
)
from app.utils.exceptions import BadRequestException, ConflictException, NotFoundException


class FacultyAvailabilityService:
    async def _validate_references(
        self,
        academic_year_id: str,
        semester_type_id: str,
        faculty_id: str,
        working_day_id: str,
        time_slot_id: str,
    ) -> None:
        if not await academic_year_repo.get_by_id(academic_year_id):
            raise NotFoundException(f"Academic year with ID '{academic_year_id}' not found")
        if not await semester_type_repo.get_by_id(semester_type_id):
            raise NotFoundException(f"Semester type with ID '{semester_type_id}' not found")
        if not await faculty_repo.get_by_id(faculty_id):
            raise NotFoundException(f"Faculty member with ID '{faculty_id}' not found")
        if not await working_day_repo.get_by_id(working_day_id):
            raise NotFoundException(f"Working day with ID '{working_day_id}' not found")

        ts = await time_slot_repo.get_by_id(time_slot_id)
        if not ts:
            raise NotFoundException(f"Time slot with ID '{time_slot_id}' not found")
        if not ts.get("isTeachingSlot", True):
            raise BadRequestException(f"Time slot '{ts.get('name')}' is not a teaching slot; availability cannot be assigned")

    async def _enrich_doc(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        result = dict(doc)
        fac = await faculty_repo.get_by_id(doc["facultyId"])
        if fac:
            result["facultyName"] = fac.get("name")
            result["facultyCode"] = fac.get("facultyCode")

        wd = await working_day_repo.get_by_id(doc["workingDayId"])
        if wd:
            result["dayName"] = wd.get("name")
            result["dayOrder"] = wd.get("dayOrder")

        ts = await time_slot_repo.get_by_id(doc["timeSlotId"])
        if ts:
            result["timeSlotName"] = ts.get("name")
            result["startTime"] = ts.get("startTime")
            result["endTime"] = ts.get("endTime")
            result["slotOrder"] = ts.get("slotOrder")

        return result

    async def create(self, data: FacultyAvailabilityCreate) -> Dict[str, Any]:
        await self._validate_references(
            data.academicYearId,
            data.semesterTypeId,
            data.facultyId,
            data.workingDayId,
            data.timeSlotId,
        )

        existing = await faculty_availability_repo.find_slot(
            data.academicYearId,
            data.semesterTypeId,
            data.facultyId,
            data.workingDayId,
            data.timeSlotId,
        )
        if existing:
            raise ConflictException(
                "Availability configuration already exists for this faculty member on the selected day and time slot"
            )

        doc = await faculty_availability_repo.create(data.model_dump())
        return await self._enrich_doc(doc)

    async def bulk_update(self, data: FacultyAvailabilityBulkUpdate) -> Dict[str, Any]:
        if not await academic_year_repo.get_by_id(data.academicYearId):
            raise NotFoundException(f"Academic year with ID '{data.academicYearId}' not found")
        if not await semester_type_repo.get_by_id(data.semesterTypeId):
            raise NotFoundException(f"Semester type with ID '{data.semesterTypeId}' not found")
        if not await faculty_repo.get_by_id(data.facultyId):
            raise NotFoundException(f"Faculty member with ID '{data.facultyId}' not found")

        # Validate entries
        entries_dicts = []
        for entry in data.entries:
            ts = await time_slot_repo.get_by_id(entry.timeSlotId)
            if not ts:
                raise NotFoundException(f"Time slot with ID '{entry.timeSlotId}' not found")
            if not ts.get("isTeachingSlot", True):
                raise BadRequestException(f"Time slot '{ts.get('name')}' is not a teaching slot")

            entries_dicts.append(entry.model_dump())

        count = await faculty_availability_repo.bulk_upsert(
            data.academicYearId,
            data.semesterTypeId,
            data.facultyId,
            entries_dicts,
        )
        return {"modifiedCount": count, "totalEntries": len(data.entries)}

    async def get_by_id(self, id_str: str) -> Dict[str, Any]:
        doc = await faculty_availability_repo.get_by_id(id_str)
        if not doc:
            raise NotFoundException(f"Faculty availability record with ID '{id_str}' not found")
        return await self._enrich_doc(doc)

    async def list_availability(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        faculty_id: Optional[str] = None,
        working_day_id: Optional[str] = None,
        availability_status: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 0,
    ) -> List[Dict[str, Any]]:
        docs = await faculty_availability_repo.search_availability(
            academic_year_id,
            semester_type_id,
            faculty_id,
            working_day_id,
            availability_status,
            is_active,
            skip,
            limit,
        )
        return [await self._enrich_doc(d) for d in docs]

    async def update(self, id_str: str, data: FacultyAvailabilityUpdate) -> Dict[str, Any]:
        existing = await faculty_availability_repo.get_by_id(id_str)
        if not existing:
            raise NotFoundException(f"Faculty availability record with ID '{id_str}' not found")

        update_fields = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
        doc = await faculty_availability_repo.update_by_id(id_str, update_fields)
        return await self._enrich_doc(doc)

    async def delete(self, id_str: str) -> bool:
        if not await faculty_availability_repo.get_by_id(id_str):
            raise NotFoundException(f"Faculty availability record with ID '{id_str}' not found")
        return await faculty_availability_repo.delete_by_id(id_str)


faculty_availability_service = FacultyAvailabilityService()
