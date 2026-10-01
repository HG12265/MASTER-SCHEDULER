from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Path, Query, status
from app.schemas.common import BaseResponse, DataResponse
from app.schemas.timetable import (
    TimetableResponse,
    TimetableEntryResponse,
    TimetableMasterViewResponse,
)
from app.services.timetable_generation_service import timetable_generation_service

router = APIRouter(prefix="/timetables", tags=["Timetables & Generation History"])


@router.get(
    "",
    response_model=DataResponse[List[TimetableResponse]],
    summary="List Generated Timetable Versions",
)
async def list_timetables(
    academicYearId: Optional[str] = Query(None, description="Filter by Academic Year ID"),
    semesterTypeId: Optional[str] = Query(None, description="Filter by Semester Type ID"),
    status: Optional[str] = Query(None, description="Filter by status (DRAFT, PUBLISHED, ARCHIVED)"),
):
    timetables = await timetable_generation_service.list_timetables(
        academic_year_id=academicYearId,
        semester_type_id=semesterTypeId,
        status=status,
    )
    return DataResponse(
        message="Timetables retrieved successfully",
        data=timetables,
    )


@router.get(
    "/{id}",
    response_model=DataResponse[TimetableResponse],
    summary="Get Timetable Metadata By ID",
)
async def get_timetable(
    id: str = Path(..., description="ID of timetable"),
):
    timetable = await timetable_generation_service.get_by_id(id)
    return DataResponse(
        message="Timetable retrieved successfully",
        data=timetable,
    )


@router.get(
    "/{id}/entries",
    response_model=DataResponse[List[TimetableEntryResponse]],
    summary="Get Timetable Scheduled Entries",
)
async def get_timetable_entries(
    id: str = Path(..., description="ID of timetable"),
    classId: Optional[str] = Query(None, description="Filter by Class ID"),
    facultyId: Optional[str] = Query(None, description="Filter by Faculty ID"),
    workingDayId: Optional[str] = Query(None, description="Filter by Working Day ID"),
    timeSlotId: Optional[str] = Query(None, description="Filter by Time Slot ID"),
    subjectId: Optional[str] = Query(None, description="Filter by Subject ID"),
    resourceId: Optional[str] = Query(None, description="Filter by Resource ID"),
):
    entries = await timetable_generation_service.get_entries(
        timetable_id=id,
        class_id=classId,
        faculty_id=facultyId,
        working_day_id=workingDayId,
        time_slot_id=timeSlotId,
        subject_id=subjectId,
        resource_id=resourceId,
    )
    return DataResponse(
        message="Timetable entries retrieved successfully",
        data=entries,
    )


@router.get(
    "/{id}/classes/{classId}",
    response_model=DataResponse[List[TimetableEntryResponse]],
    summary="Get Class Timetable Grid Entries",
)
async def get_class_timetable(
    id: str = Path(..., description="ID of timetable"),
    classId: str = Path(..., description="ID of class"),
):
    entries = await timetable_generation_service.get_class_timetable(id, classId)
    return DataResponse(
        message="Class timetable retrieved successfully",
        data=entries,
    )


@router.get(
    "/{id}/faculty/{facultyId}",
    response_model=DataResponse[List[TimetableEntryResponse]],
    summary="Get Faculty Timetable Grid Entries",
)
async def get_faculty_timetable(
    id: str = Path(..., description="ID of timetable"),
    facultyId: str = Path(..., description="ID of faculty"),
):
    entries = await timetable_generation_service.get_faculty_timetable(id, facultyId)
    return DataResponse(
        message="Faculty timetable retrieved successfully",
        data=entries,
    )


@router.get(
    "/{id}/master",
    response_model=DataResponse[TimetableMasterViewResponse],
    summary="Get Master Multi-Class Timetable View",
)
async def get_master_timetable(
    id: str = Path(..., description="ID of timetable"),
):
    data = await timetable_generation_service.get_master_view(id)
    return DataResponse(
        message="Master timetable view retrieved successfully",
        data=data,
    )


@router.delete(
    "/{id}",
    response_model=BaseResponse,
    summary="Delete Draft Timetable Version",
)
async def delete_timetable(
    id: str = Path(..., description="ID of timetable"),
):
    await timetable_generation_service.delete_timetable(id)
    return BaseResponse(message="Draft timetable deleted successfully")
