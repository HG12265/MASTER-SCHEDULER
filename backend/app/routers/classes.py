from typing import Optional
from fastapi import APIRouter, Path, Query, status
from app.schemas.class_model import (
    ClassCreate,
    ClassUpdate,
    ClassResponse,
)
from app.schemas.common import BaseResponse, DataResponse, PaginatedResponse
from app.services.class_service import class_service

router = APIRouter(prefix="/classes", tags=["Classes"])


@router.post(
    "",
    response_model=DataResponse[ClassResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Class",
)
async def create_class(data: ClassCreate):
    record = await class_service.create(data)
    return DataResponse(
        message="Class created successfully",
        data=ClassResponse(**record),
    )


@router.get(
    "",
    response_model=PaginatedResponse[ClassResponse],
    summary="List Classes (with Filters, Search & Pagination)",
)
async def list_classes(
    programmeId: Optional[str] = Query(None, description="Filter by Programme ID"),
    semesterId: Optional[str] = Query(None, description="Filter by Semester ID"),
    academicYearId: Optional[str] = Query(None, description="Filter by Academic Year ID"),
    semesterTypeId: Optional[str] = Query(None, description="Filter by Semester Type ID"),
    isActive: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name or displayName"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=500, description="Items per page"),
):
    result = await class_service.list_classes(
        programmeId, semesterId, academicYearId, semesterTypeId, isActive, search, page, limit
    )
    return PaginatedResponse(
        message="Classes retrieved successfully",
        data=[ClassResponse(**item) for item in result["items"]],
        pagination=result["pagination"],
    )


@router.get(
    "/{id}",
    response_model=DataResponse[ClassResponse],
    summary="Get Class by ID",
)
async def get_class(id: str = Path(..., description="Class ID")):
    record = await class_service.get_by_id(id)
    return DataResponse(
        message="Class retrieved successfully",
        data=ClassResponse(**record),
    )


@router.put(
    "/{id}",
    response_model=DataResponse[ClassResponse],
    summary="Update Class",
)
async def update_class(
    data: ClassUpdate, id: str = Path(..., description="Class ID")
):
    record = await class_service.update(id, data)
    return DataResponse(
        message="Class updated successfully",
        data=ClassResponse(**record),
    )


@router.delete(
    "/{id}",
    response_model=BaseResponse,
    summary="Delete Class",
)
async def delete_class(id: str = Path(..., description="Class ID")):
    await class_service.delete(id)
    return BaseResponse(message="Class deleted successfully")
