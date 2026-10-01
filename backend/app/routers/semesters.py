from typing import List, Optional
from fastapi import APIRouter, Path, Query, status
from app.schemas.semester import (
    SemesterCreate,
    SemesterUpdate,
    SemesterResponse,
)
from app.schemas.common import BaseResponse, DataResponse
from app.services.semester_service import semester_service

router = APIRouter(prefix="/semesters", tags=["Semesters"])


@router.post(
    "",
    response_model=DataResponse[SemesterResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Semester",
)
async def create_semester(data: SemesterCreate):
    record = await semester_service.create(data)
    return DataResponse(
        message="Semester created successfully",
        data=SemesterResponse(**record),
    )


@router.get(
    "",
    response_model=DataResponse[List[SemesterResponse]],
    summary="List Semesters",
)
async def list_semesters(
    programmeId: Optional[str] = Query(None, description="Filter by programme ID"),
    isActive: Optional[bool] = Query(None, description="Filter by active status"),
):
    records = await semester_service.list_semesters(programmeId, isActive)
    return DataResponse(
        message="Semesters retrieved successfully",
        data=[SemesterResponse(**r) for r in records],
    )


@router.get(
    "/{id}",
    response_model=DataResponse[SemesterResponse],
    summary="Get Semester by ID",
)
async def get_semester(id: str = Path(..., description="Semester ID")):
    record = await semester_service.get_by_id(id)
    return DataResponse(
        message="Semester retrieved successfully",
        data=SemesterResponse(**record),
    )


@router.put(
    "/{id}",
    response_model=DataResponse[SemesterResponse],
    summary="Update Semester",
)
async def update_semester(
    data: SemesterUpdate, id: str = Path(..., description="Semester ID")
):
    record = await semester_service.update(id, data)
    return DataResponse(
        message="Semester updated successfully",
        data=SemesterResponse(**record),
    )


@router.delete(
    "/{id}",
    response_model=BaseResponse,
    summary="Delete Semester",
)
async def delete_semester(id: str = Path(..., description="Semester ID")):
    await semester_service.delete(id)
    return BaseResponse(message="Semester deleted successfully")
