from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from app.schemas.academic_calendar import (
    AcademicCalendarExceptionCreate,
    AcademicCalendarExceptionUpdate,
    AcademicCalendarExceptionResponse,
    DateLookupResponse,
)
from app.schemas.rbac import Permission
from app.services.academic_calendar_service import academic_calendar_service
from app.middleware.auth import require_permission, get_optional_current_user

router = APIRouter(prefix="/academic-calendar", tags=["Academic Calendar"])


@router.get("", response_model=List[AcademicCalendarExceptionResponse], summary="List Calendar Exceptions")
async def list_calendar_exceptions(
    academicYearId: Optional[str] = Query(None, description="Filter by Academic Year ID"),
    startDate: Optional[str] = Query(None, description="Filter start date YYYY-MM-DD"),
    endDate: Optional[str] = Query(None, description="Filter end date YYYY-MM-DD"),
):
    """
    List calendar exceptions (holidays, special working days, exam days).
    """
    return await academic_calendar_service.list_exceptions(
        academic_year_id=academicYearId,
        start_date=startDate,
        end_date=endDate,
    )


@router.get("/date-lookup", response_model=DateLookupResponse, summary="Lookup Date Schedule Rules")
async def lookup_date(
    date: str = Query(..., description="Target date YYYY-MM-DD"),
):
    """
    Resolve operational schedule rules for a specific calendar date.
    Determines whether it is a teaching day, holiday, or mapped to another working day.
    """
    return await academic_calendar_service.resolve_date(date)


@router.get("/{id}", response_model=AcademicCalendarExceptionResponse, summary="Get Calendar Exception")
async def get_calendar_exception(id: str):
    """
    Get details of a specific calendar exception.
    """
    return await academic_calendar_service.get_by_id(id)


@router.post("", response_model=AcademicCalendarExceptionResponse, status_code=status.HTTP_201_CREATED, summary="Create Calendar Exception")
async def create_calendar_exception(
    payload: AcademicCalendarExceptionCreate,
    current_user: dict = Depends(require_permission(Permission.ACADEMIC_MANAGE)),
):
    """
    Add a new holiday or special working day exception. Requires academic.manage permission.
    """
    return await academic_calendar_service.create_exception(payload)


@router.put("/{id}", response_model=AcademicCalendarExceptionResponse, summary="Update Calendar Exception")
async def update_calendar_exception(
    id: str,
    payload: AcademicCalendarExceptionUpdate,
    current_user: dict = Depends(require_permission(Permission.ACADEMIC_MANAGE)),
):
    """
    Update an existing calendar exception. Requires academic.manage permission.
    """
    return await academic_calendar_service.update_exception(id, payload)


@router.delete("/{id}", status_code=status.HTTP_200_OK, summary="Delete Calendar Exception")
async def delete_calendar_exception(
    id: str,
    current_user: dict = Depends(require_permission(Permission.ACADEMIC_MANAGE)),
):
    """
    Delete a calendar exception. Requires academic.manage permission.
    """
    success = await academic_calendar_service.delete_exception(id)
    return {"success": success, "message": "Calendar exception deleted"}
