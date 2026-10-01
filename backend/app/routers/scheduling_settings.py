from typing import List, Optional
from fastapi import APIRouter, Path, Query, status
from app.schemas.scheduling_settings import (
    SchedulingSettingsCreate,
    SchedulingSettingsUpdate,
    SchedulingSettingsResponse,
)
from app.schemas.common import DataResponse
from app.services.scheduling_settings_service import scheduling_settings_service

router = APIRouter(prefix="/scheduling-settings", tags=["Scheduling Settings"])


@router.get(
    "/current",
    response_model=DataResponse[SchedulingSettingsResponse],
    summary="Get Current Active Scheduling Settings",
)
async def get_current_settings():
    record = await scheduling_settings_service.get_current()
    return DataResponse(
        message="Current scheduling settings retrieved",
        data=SchedulingSettingsResponse(**record),
    )


@router.get(
    "",
    response_model=DataResponse[List[SchedulingSettingsResponse]],
    summary="List Scheduling Settings",
)
async def list_settings(
    academicYearId: Optional[str] = Query(None, description="Filter by Academic Year ID"),
    semesterTypeId: Optional[str] = Query(None, description="Filter by Semester Type ID"),
    isActive: Optional[bool] = Query(None, description="Filter by active status"),
):
    records = await scheduling_settings_service.list_settings(
        academic_year_id=academicYearId,
        semester_type_id=semesterTypeId,
        is_active=isActive,
    )
    return DataResponse(
        message="Scheduling settings retrieved successfully",
        data=[SchedulingSettingsResponse(**r) for r in records],
    )


@router.post(
    "",
    response_model=DataResponse[SchedulingSettingsResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Global Scheduling Settings for Term",
)
async def create_settings(data: SchedulingSettingsCreate):
    record = await scheduling_settings_service.create(data)
    return DataResponse(
        message="Scheduling settings configured successfully",
        data=SchedulingSettingsResponse(**record),
    )


@router.put(
    "/{id}",
    response_model=DataResponse[SchedulingSettingsResponse],
    summary="Update Scheduling Settings",
)
async def update_settings(
    data: SchedulingSettingsUpdate,
    id: str = Path(..., description="ID of scheduling settings"),
):
    record = await scheduling_settings_service.update(id, data)
    return DataResponse(
        message="Scheduling settings updated successfully",
        data=SchedulingSettingsResponse(**record),
    )
