from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Path, Query, status
from app.schemas.faculty_availability import (
    FacultyAvailabilityCreate,
    FacultyAvailabilityUpdate,
    FacultyAvailabilityResponse,
    FacultyAvailabilityBulkUpdate,
)
from app.schemas.common import BaseResponse, DataResponse
from app.services.faculty_availability_service import faculty_availability_service

router = APIRouter(prefix="/faculty-availability", tags=["Faculty Availability"])


@router.post(
    "",
    response_model=DataResponse[FacultyAvailabilityResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Faculty Availability Record",
)
async def create_availability(data: FacultyAvailabilityCreate):
    record = await faculty_availability_service.create(data)
    return DataResponse(
        message="Faculty availability configured successfully",
        data=FacultyAvailabilityResponse(**record),
    )


@router.put(
    "/bulk",
    response_model=DataResponse[Dict[str, Any]],
    summary="Bulk Upsert Faculty Weekly Availability",
)
async def bulk_update_availability(data: FacultyAvailabilityBulkUpdate):
    result = await faculty_availability_service.bulk_update(data)
    return DataResponse(
        message="Faculty weekly availability updated successfully",
        data=result,
    )


@router.get(
    "",
    response_model=DataResponse[List[FacultyAvailabilityResponse]],
    summary="List Faculty Availability Slots",
)
async def list_availability(
    academicYearId: Optional[str] = Query(None, description="Filter by Academic Year ID"),
    semesterTypeId: Optional[str] = Query(None, description="Filter by Semester Type ID"),
    facultyId: Optional[str] = Query(None, description="Filter by Faculty ID"),
    workingDayId: Optional[str] = Query(None, description="Filter by Working Day ID"),
    availabilityStatus: Optional[str] = Query(None, description="AVAILABLE, UNAVAILABLE, PREFERRED, AVOID"),
    isActive: Optional[bool] = Query(None, description="Filter by active status"),
):
    records = await faculty_availability_service.list_availability(
        academic_year_id=academicYearId,
        semester_type_id=semesterTypeId,
        faculty_id=facultyId,
        working_day_id=workingDayId,
        availability_status=availabilityStatus,
        is_active=isActive,
    )
    return DataResponse(
        message="Faculty availability records retrieved successfully",
        data=[FacultyAvailabilityResponse(**r) for r in records],
    )


@router.get(
    "/{id}",
    response_model=DataResponse[FacultyAvailabilityResponse],
    summary="Get Faculty Availability By ID",
)
async def get_availability(
    id: str = Path(..., description="ID of availability record"),
):
    record = await faculty_availability_service.get_by_id(id)
    return DataResponse(
        message="Faculty availability record retrieved",
        data=FacultyAvailabilityResponse(**record),
    )


@router.put(
    "/{id}",
    response_model=DataResponse[FacultyAvailabilityResponse],
    summary="Update Faculty Availability",
)
async def update_availability(
    data: FacultyAvailabilityUpdate,
    id: str = Path(..., description="ID of availability record"),
):
    record = await faculty_availability_service.update(id, data)
    return DataResponse(
        message="Faculty availability updated successfully",
        data=FacultyAvailabilityResponse(**record),
    )


@router.delete(
    "/{id}",
    response_model=BaseResponse,
    summary="Delete Faculty Availability Record",
)
async def delete_availability(
    id: str = Path(..., description="ID of availability record"),
):
    await faculty_availability_service.delete(id)
    return BaseResponse(message="Faculty availability record deleted successfully")
