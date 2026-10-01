from typing import List, Optional
from fastapi import APIRouter, Path, Query, status
from app.schemas.fixed_slot import (
    FixedSlotCreate,
    FixedSlotUpdate,
    FixedSlotResponse,
)
from app.schemas.common import BaseResponse, DataResponse
from app.services.fixed_slot_service import fixed_slot_service

router = APIRouter(prefix="/fixed-slots", tags=["Fixed Timetable Slots"])


@router.post(
    "",
    response_model=DataResponse[FixedSlotResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Fixed Timetable Slot",
)
async def create_fixed_slot(data: FixedSlotCreate):
    record = await fixed_slot_service.create(data)
    return DataResponse(
        message="Fixed timetable slot locked successfully",
        data=FixedSlotResponse(**record),
    )


@router.get(
    "",
    response_model=DataResponse[List[FixedSlotResponse]],
    summary="List Fixed Timetable Slots",
)
async def list_fixed_slots(
    academicYearId: Optional[str] = Query(None, description="Filter by Academic Year ID"),
    semesterTypeId: Optional[str] = Query(None, description="Filter by Semester Type ID"),
    classId: Optional[str] = Query(None, description="Filter by Class ID"),
    facultyId: Optional[str] = Query(None, description="Filter by Faculty ID"),
    workingDayId: Optional[str] = Query(None, description="Filter by Working Day ID"),
    slotCategory: Optional[str] = Query(None, description="Filter by Category (LIBRARY, SUBJECT, etc.)"),
    isActive: Optional[bool] = Query(None, description="Filter by active status"),
):
    records = await fixed_slot_service.list_fixed_slots(
        academic_year_id=academicYearId,
        semester_type_id=semesterTypeId,
        class_id=classId,
        faculty_id=facultyId,
        working_day_id=workingDayId,
        slot_category=slotCategory,
        is_active=isActive,
    )
    return DataResponse(
        message="Fixed timetable slots retrieved successfully",
        data=[FixedSlotResponse(**r) for r in records],
    )


@router.get(
    "/{id}",
    response_model=DataResponse[FixedSlotResponse],
    summary="Get Fixed Timetable Slot By ID",
)
async def get_fixed_slot(
    id: str = Path(..., description="ID of fixed slot"),
):
    record = await fixed_slot_service.get_by_id(id)
    return DataResponse(
        message="Fixed timetable slot retrieved",
        data=FixedSlotResponse(**record),
    )


@router.put(
    "/{id}",
    response_model=DataResponse[FixedSlotResponse],
    summary="Update Fixed Timetable Slot",
)
async def update_fixed_slot(
    data: FixedSlotUpdate,
    id: str = Path(..., description="ID of fixed slot"),
):
    record = await fixed_slot_service.update(id, data)
    return DataResponse(
        message="Fixed timetable slot updated successfully",
        data=FixedSlotResponse(**record),
    )


@router.delete(
    "/{id}",
    response_model=BaseResponse,
    summary="Delete Fixed Timetable Slot",
)
async def delete_fixed_slot(
    id: str = Path(..., description="ID of fixed slot"),
):
    await fixed_slot_service.delete(id)
    return BaseResponse(message="Fixed timetable slot deleted successfully")
