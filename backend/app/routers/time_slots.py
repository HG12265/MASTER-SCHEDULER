from typing import List
from fastapi import APIRouter, Path, status
from app.schemas.time_slot import (
    TimeSlotCreate,
    TimeSlotUpdate,
    TimeSlotResponse,
)
from app.schemas.common import BaseResponse, DataResponse
from app.services.time_slot_service import time_slot_service

router = APIRouter(prefix="/time-slots", tags=["Time Slots"])


@router.post(
    "",
    response_model=DataResponse[TimeSlotResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Time Slot",
)
async def create_time_slot(data: TimeSlotCreate):
    record = await time_slot_service.create(data)
    return DataResponse(
        message="Time slot created successfully",
        data=TimeSlotResponse(**record),
    )


@router.get(
    "",
    response_model=DataResponse[List[TimeSlotResponse]],
    summary="List Time Slots (Sorted by slotOrder)",
)
async def list_time_slots():
    records = await time_slot_service.list_all()
    return DataResponse(
        message="Time slots retrieved successfully",
        data=[TimeSlotResponse(**r) for r in records],
    )


@router.get(
    "/{id}",
    response_model=DataResponse[TimeSlotResponse],
    summary="Get Time Slot by ID",
)
async def get_time_slot(id: str = Path(..., description="Time Slot ID")):
    record = await time_slot_service.get_by_id(id)
    return DataResponse(
        message="Time slot retrieved successfully",
        data=TimeSlotResponse(**record),
    )


@router.put(
    "/{id}",
    response_model=DataResponse[TimeSlotResponse],
    summary="Update Time Slot",
)
async def update_time_slot(
    data: TimeSlotUpdate, id: str = Path(..., description="Time Slot ID")
):
    record = await time_slot_service.update(id, data)
    return DataResponse(
        message="Time slot updated successfully",
        data=TimeSlotResponse(**record),
    )


@router.delete(
    "/{id}",
    response_model=BaseResponse,
    summary="Delete Time Slot",
)
async def delete_time_slot(id: str = Path(..., description="Time Slot ID")):
    await time_slot_service.delete(id)
    return BaseResponse(message="Time slot deleted successfully")
