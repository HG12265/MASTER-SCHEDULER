from typing import Optional
from fastapi import APIRouter, Path, Query, status
from app.schemas.resource import (
    ResourceCreate,
    ResourceUpdate,
    ResourceResponse,
)
from app.schemas.common import BaseResponse, DataResponse, PaginatedResponse
from app.services.resource_service import resource_service

router = APIRouter(prefix="/resources", tags=["Resources & Rooms"])


@router.post(
    "",
    response_model=DataResponse[ResourceResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Resource (Room / Lab)",
)
async def create_resource(data: ResourceCreate):
    record = await resource_service.create(data)
    return DataResponse(
        message="Resource created successfully",
        data=ResourceResponse(**record),
    )


@router.get(
    "",
    response_model=PaginatedResponse[ResourceResponse],
    summary="List Resources (with Filters, Search & Pagination)",
)
async def list_resources(
    resourceType: Optional[str] = Query(None, description="Filter by Resource Type (CLASSROOM, LAB, etc.)"),
    isActive: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by code, name, or location"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=500, description="Items per page"),
):
    result = await resource_service.list_resources(resourceType, isActive, search, page, limit)
    return PaginatedResponse(
        message="Resources retrieved successfully",
        data=[ResourceResponse(**item) for item in result["items"]],
        pagination=result["pagination"],
    )


@router.get(
    "/{id}",
    response_model=DataResponse[ResourceResponse],
    summary="Get Resource by ID",
)
async def get_resource(id: str = Path(..., description="Resource ID")):
    record = await resource_service.get_by_id(id)
    return DataResponse(
        message="Resource retrieved successfully",
        data=ResourceResponse(**record),
    )


@router.put(
    "/{id}",
    response_model=DataResponse[ResourceResponse],
    summary="Update Resource",
)
async def update_resource(
    data: ResourceUpdate, id: str = Path(..., description="Resource ID")
):
    record = await resource_service.update(id, data)
    return DataResponse(
        message="Resource updated successfully",
        data=ResourceResponse(**record),
    )


@router.delete(
    "/{id}",
    response_model=BaseResponse,
    summary="Delete Resource",
)
async def delete_resource(id: str = Path(..., description="Resource ID")):
    await resource_service.delete(id)
    return BaseResponse(message="Resource deleted successfully")
