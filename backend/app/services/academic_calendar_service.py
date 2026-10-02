from datetime import datetime, date
from typing import List, Optional, Dict, Any
from app.repositories.academic_calendar_repository import academic_calendar_repository
from app.repositories.working_day_repository import working_day_repository
from app.repositories.academic_year_repository import academic_year_repository
from app.schemas.academic_calendar import (
    AcademicCalendarExceptionCreate,
    AcademicCalendarExceptionUpdate,
    AcademicCalendarExceptionResponse,
    DateLookupResponse,
)
from app.utils.exceptions import NotFoundException, ConflictException, BadRequestException
from app.utils.logger import get_logger

logger = get_logger(__name__)

WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


class AcademicCalendarService:
    def __init__(self):
        self.repo = academic_calendar_repository

    async def _format_exception(self, doc: Dict[str, Any]) -> AcademicCalendarExceptionResponse:
        ay_name = None
        if doc.get("academicYearId"):
            ay = await academic_year_repository.get_by_id(doc["academicYearId"])
            if ay:
                ay_name = ay.get("name")

        mapped_day_name = None
        if doc.get("mappedWorkingDayId"):
            wd = await working_day_repository.get_by_id(doc["mappedWorkingDayId"])
            if wd:
                mapped_day_name = wd.get("name")

        return AcademicCalendarExceptionResponse(
            id=str(doc.get("id") or doc.get("_id")),
            academicYearId=str(doc.get("academicYearId", "")),
            academicYearName=ay_name,
            date=str(doc.get("date", "")),
            type=str(doc.get("type", "HOLIDAY")),
            title=str(doc.get("title", "")),
            isTeachingDay=bool(doc.get("isTeachingDay", False)),
            mappedWorkingDayId=doc.get("mappedWorkingDayId"),
            mappedWorkingDayName=mapped_day_name,
            notes=doc.get("notes"),
            createdAt=doc.get("createdAt").isoformat() if isinstance(doc.get("createdAt"), datetime) else str(doc.get("createdAt")) if doc.get("createdAt") else None,
            updatedAt=doc.get("updatedAt").isoformat() if isinstance(doc.get("updatedAt"), datetime) else str(doc.get("updatedAt")) if doc.get("updatedAt") else None,
        )

    async def list_exceptions(
        self,
        academic_year_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[AcademicCalendarExceptionResponse]:
        query: Dict[str, Any] = {}
        if academic_year_id:
            query["academicYearId"] = academic_year_id

        if start_date or end_date:
            date_filter: Dict[str, Any] = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            query["date"] = date_filter

        docs = await self.repo.find_many(query, sort=[("date", 1)])
        return [await self._format_exception(d) for d in docs]

    async def get_by_id(self, exception_id: str) -> AcademicCalendarExceptionResponse:
        doc = await self.repo.get_by_id(exception_id)
        if not doc:
            raise NotFoundException("CalendarException", exception_id)
        return await self._format_exception(doc)

    async def create_exception(self, payload: AcademicCalendarExceptionCreate) -> AcademicCalendarExceptionResponse:
        # Validate date format YYYY-MM-DD
        try:
            parsed_date = datetime.strptime(payload.date, "%Y-%m-%d").date()
        except ValueError:
            raise BadRequestException("Invalid date format. Use YYYY-MM-DD.")

        # Check existing exception on date
        existing = await self.repo.get_by_date(payload.date)
        if existing:
            raise ConflictException(f"A calendar exception already exists for date '{payload.date}'")

        # Verify academicYearId
        ay = await academic_year_repository.get_by_id(payload.academicYearId)
        if not ay:
            raise NotFoundException("AcademicYear", payload.academicYearId)

        # If mappedWorkingDayId provided, verify it exists
        if payload.mappedWorkingDayId:
            wd = await working_day_repository.get_by_id(payload.mappedWorkingDayId)
            if not wd:
                raise NotFoundException("WorkingDay", payload.mappedWorkingDayId)

        data = {
            "academicYearId": payload.academicYearId,
            "date": payload.date,
            "type": payload.type.value if hasattr(payload.type, "value") else str(payload.type),
            "title": payload.title.strip(),
            "isTeachingDay": payload.isTeachingDay,
            "mappedWorkingDayId": payload.mappedWorkingDayId,
            "notes": payload.notes,
        }

        created = await self.repo.create(data)
        return await self._format_exception(created)

    async def update_exception(self, exception_id: str, payload: AcademicCalendarExceptionUpdate) -> AcademicCalendarExceptionResponse:
        doc = await self.repo.get_by_id(exception_id)
        if not doc:
            raise NotFoundException("CalendarException", exception_id)

        update_dict: Dict[str, Any] = {}
        if payload.type is not None:
            update_dict["type"] = payload.type.value if hasattr(payload.type, "value") else str(payload.type)
        if payload.title is not None:
            update_dict["title"] = payload.title.strip()
        if payload.isTeachingDay is not None:
            update_dict["isTeachingDay"] = payload.isTeachingDay
        if payload.mappedWorkingDayId is not None:
            if payload.mappedWorkingDayId != "":
                wd = await working_day_repository.get_by_id(payload.mappedWorkingDayId)
                if not wd:
                    raise NotFoundException("WorkingDay", payload.mappedWorkingDayId)
                update_dict["mappedWorkingDayId"] = payload.mappedWorkingDayId
            else:
                update_dict["mappedWorkingDayId"] = None
        if payload.notes is not None:
            update_dict["notes"] = payload.notes

        updated = await self.repo.update_by_id(exception_id, update_dict)
        return await self._format_exception(updated)

    async def delete_exception(self, exception_id: str) -> bool:
        doc = await self.repo.get_by_id(exception_id)
        if not doc:
            raise NotFoundException("CalendarException", exception_id)
        return await self.repo.delete_by_id(exception_id)

    async def resolve_date(self, date_str: str) -> DateLookupResponse:
        """
        Determine operational schedule rules for a specific calendar date (YYYY-MM-DD).
        """
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            raise BadRequestException("Invalid date format. Expected YYYY-MM-DD.")

        # 0 = Monday, 6 = Sunday
        weekday_idx = target_date.weekday()
        day_of_week = WEEKDAY_NAMES[weekday_idx]

        # Find matching default working day from database
        all_working_days = await working_day_repository.find_many(sort=[("dayOrder", 1)])
        matched_wd = None
        for wd in all_working_days:
            # dayOrder is typically 1=Mon, 2=Tue... or name matches
            wd_name = wd.get("name", "").strip().lower()
            if wd_name == day_of_week.lower() or wd.get("dayOrder") == (weekday_idx + 1):
                matched_wd = wd
                break

        # Check calendar exceptions for that date
        exception_doc = await self.repo.get_by_date(date_str)

        if exception_doc:
            is_teaching = bool(exception_doc.get("isTeachingDay", False))
            mapped_wd_id = exception_doc.get("mappedWorkingDayId")

            effective_wd_id = None
            effective_wd_name = None

            if mapped_wd_id:
                m_wd = await working_day_repository.get_by_id(mapped_wd_id)
                if m_wd:
                    effective_wd_id = str(m_wd.get("id") or m_wd.get("_id"))
                    effective_wd_name = m_wd.get("name")
            elif is_teaching and matched_wd:
                effective_wd_id = str(matched_wd.get("id") or matched_wd.get("_id"))
                effective_wd_name = matched_wd.get("name")

            return DateLookupResponse(
                date=date_str,
                dayOfWeek=day_of_week,
                isWorkingDay=bool(matched_wd.get("isWorkingDay", False)) if matched_wd else False,
                isTeachingDay=is_teaching,
                effectiveWorkingDayId=effective_wd_id,
                effectiveWorkingDayName=effective_wd_name,
                isException=True,
                exceptionType=exception_doc.get("type"),
                exceptionTitle=exception_doc.get("title"),
            )

        # No exception: standard working day logic
        is_working = bool(matched_wd.get("isWorkingDay", False)) if matched_wd else False
        is_teaching = is_working

        return DateLookupResponse(
            date=date_str,
            dayOfWeek=day_of_week,
            isWorkingDay=is_working,
            isTeachingDay=is_teaching,
            effectiveWorkingDayId=str(matched_wd.get("id") or matched_wd.get("_id")) if matched_wd and is_working else None,
            effectiveWorkingDayName=matched_wd.get("name") if matched_wd and is_working else None,
            isException=False,
        )


academic_calendar_service = AcademicCalendarService()
