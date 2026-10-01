from typing import Optional
from fastapi import APIRouter, Path, Query, status
from app.schemas.programme import (
    ProgrammeCreate,
    ProgrammeUpdate,
    ProgrammeResponse,
)
from app.schemas.common import BaseResponse, DataResponse, PaginatedResponse
from app.services.programme_service import programme_service

router = APIRouter(prefix="/programmes", tags=["Programmes"])


@router.post(
    "",
    response_model=DataResponse[ProgrammeResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Programme",
)
async def create_programme(data: ProgrammeCreate):
    record = await programme_service.create(data)
    return DataResponse(
        message="Programme created successfully",
        data=ProgrammeResponse(**record),
    )


@router.get(
    "",
    response_model=PaginatedResponse[ProgrammeResponse],
    summary="List Programmes (with Search & Pagination)",
)
async def list_programmes(
    search: Optional[str] = Query(None, description="Search by name, code, or shortName"),
    isActive: Optional[bool] = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=500, description="Items per page"),
):
    result = await programme_service.list_programmes(search, isActive, page, limit)
    return PaginatedResponse(
        message="Programmes retrieved successfully",
        data=[ProgrammeResponse(**item) for item in result["items"]],
        pagination=result["pagination"],
    )


@router.get(
    "/{id}",
    response_model=DataResponse[ProgrammeResponse],
    summary="Get Programme by ID",
)
async def get_programme(id: str = Path(..., description="Programme ID")):
    record = await programme_service.get_by_id(id)
    return DataResponse(
        message="Programme retrieved successfully",
        data=ProgrammeResponse(**record),
    )


@router.put(
    "/{id}",
    response_model=DataResponse[ProgrammeResponse],
    summary="Update Programme",
)
async def update_programme(
    data: ProgrammeUpdate, id: str = Path(..., description="Programme ID")
):
    record = await programme_service.update(id, data)
    return DataResponse(
        message="Programme updated successfully",
        data=ProgrammeResponse(**record),
    )


@router.delete(
    "/{id}",
    response_model=BaseResponse,
    summary="Delete Programme",
)
async def delete_programme(id: str = Path(..., description="Programme ID")):
    await programme_service.delete(id)
    return BaseResponse(message="Programme deleted successfully")
