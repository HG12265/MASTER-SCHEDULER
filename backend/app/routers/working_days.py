from typing import List
from fastapi import APIRouter, Path, status
from app.schemas.working_day import (
    WorkingDayCreate,
    WorkingDayUpdate,
    WorkingDayResponse,
)
from app.schemas.common import BaseResponse, DataResponse
from app.services.working_day_service import working_day_service

router = APIRouter(prefix="/working-days", tags=["Working Days"])


@router.post(
    "",
    response_model=DataResponse[WorkingDayResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Working Day",
)
async def create_working_day(data: WorkingDayCreate):
    record = await working_day_service.create(data)
    return DataResponse(
        message="Working day created successfully",
        data=WorkingDayResponse(**record),
    )


@router.get(
    "",
    response_model=DataResponse[List[WorkingDayResponse]],
    summary="List Working Days (Sorted by dayOrder)",
)
async def list_working_days():
    records = await working_day_service.list_all()
    return DataResponse(
        message="Working days retrieved successfully",
        data=[WorkingDayResponse(**r) for r in records],
    )


@router.get(
    "/{id}",
    response_model=DataResponse[WorkingDayResponse],
    summary="Get Working Day by ID",
)
async def get_working_day(id: str = Path(..., description="Working Day ID")):
    record = await working_day_service.get_by_id(id)
    return DataResponse(
        message="Working day retrieved successfully",
        data=WorkingDayResponse(**record),
    )


@router.put(
    "/{id}",
    response_model=DataResponse[WorkingDayResponse],
    summary="Update Working Day",
)
async def update_working_day(
    data: WorkingDayUpdate, id: str = Path(..., description="Working Day ID")
):
    record = await working_day_service.update(id, data)
    return DataResponse(
        message="Working day updated successfully",
        data=WorkingDayResponse(**record),
    )


@router.delete(
    "/{id}",
    response_model=BaseResponse,
    summary="Delete Working Day",
)
async def delete_working_day(id: str = Path(..., description="Working Day ID")):
    await working_day_service.delete(id)
    return BaseResponse(message="Working day deleted successfully")
