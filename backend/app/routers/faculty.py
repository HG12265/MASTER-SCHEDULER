from typing import Optional
from fastapi import APIRouter, Path, Query, status
from app.schemas.faculty import (
    FacultyCreate,
    FacultyUpdate,
    FacultyResponse,
)
from app.schemas.common import BaseResponse, DataResponse, PaginatedResponse
from app.services.faculty_service import faculty_service

router = APIRouter(prefix="/faculty", tags=["Faculty"])


@router.post(
    "",
    response_model=DataResponse[FacultyResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Faculty Member",
)
async def create_faculty(data: FacultyCreate):
    record = await faculty_service.create(data)
    return DataResponse(
        message="Faculty member created successfully",
        data=FacultyResponse(**record),
    )


@router.get(
    "",
    response_model=PaginatedResponse[FacultyResponse],
    summary="List Faculty (with Search & Pagination)",
)
async def list_faculty(
    search: Optional[str] = Query(None, description="Search by name, facultyCode, designation, or email"),
    isActive: Optional[bool] = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=500, description="Items per page"),
):
    result = await faculty_service.list_faculty(search, isActive, page, limit)
    return PaginatedResponse(
        message="Faculty members retrieved successfully",
        data=[FacultyResponse(**item) for item in result["items"]],
        pagination=result["pagination"],
    )


@router.get(
    "/{id}",
    response_model=DataResponse[FacultyResponse],
    summary="Get Faculty by ID",
)
async def get_faculty(id: str = Path(..., description="Faculty ID")):
    record = await faculty_service.get_by_id(id)
    return DataResponse(
        message="Faculty member retrieved successfully",
        data=FacultyResponse(**record),
    )


@router.put(
    "/{id}",
    response_model=DataResponse[FacultyResponse],
    summary="Update Faculty",
)
async def update_faculty(
    data: FacultyUpdate, id: str = Path(..., description="Faculty ID")
):
    record = await faculty_service.update(id, data)
    return DataResponse(
        message="Faculty member updated successfully",
        data=FacultyResponse(**record),
    )


@router.delete(
    "/{id}",
    response_model=BaseResponse,
    summary="Delete Faculty",
)
async def delete_faculty(id: str = Path(..., description="Faculty ID")):
    await faculty_service.delete(id)
    return BaseResponse(message="Faculty member deleted successfully")
