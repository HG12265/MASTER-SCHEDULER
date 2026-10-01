from typing import Optional
from fastapi import APIRouter, Path, Query, status
from app.schemas.faculty_allocation import (
    FacultyAllocationCreate,
    FacultyAllocationUpdate,
    FacultyAllocationResponse,
)
from app.schemas.common import BaseResponse, DataResponse, PaginatedResponse
from app.services.faculty_allocation_service import faculty_allocation_service

router = APIRouter(prefix="/faculty-allocations", tags=["Faculty Allocations"])


@router.post(
    "",
    response_model=DataResponse[FacultyAllocationResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Faculty Subject Allocation",
)
async def create_faculty_allocation(data: FacultyAllocationCreate):
    record = await faculty_allocation_service.create(data)
    return DataResponse(
        message="Faculty subject allocation created successfully",
        data=FacultyAllocationResponse(**record),
    )


@router.get(
    "",
    response_model=PaginatedResponse[FacultyAllocationResponse],
    summary="List Faculty Allocations (with Filters & Pagination)",
)
async def list_faculty_allocations(
    classId: Optional[str] = Query(None, description="Filter by Class ID"),
    facultyId: Optional[str] = Query(None, description="Filter by assigned Faculty ID"),
    subjectId: Optional[str] = Query(None, description="Filter by Subject ID"),
    academicYearId: Optional[str] = Query(None, description="Filter by Academic Year ID"),
    semesterTypeId: Optional[str] = Query(None, description="Filter by Semester Type ID"),
    isActive: Optional[bool] = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=500, description="Items per page"),
):
    result = await faculty_allocation_service.list_allocations(
        classId, facultyId, subjectId, academicYearId, semesterTypeId, isActive, page, limit
    )
    return PaginatedResponse(
        message="Faculty allocations retrieved successfully",
        data=[FacultyAllocationResponse(**item) for item in result["items"]],
        pagination=result["pagination"],
    )


@router.get(
    "/{id}",
    response_model=DataResponse[FacultyAllocationResponse],
    summary="Get Faculty Allocation by ID",
)
async def get_faculty_allocation(id: str = Path(..., description="Allocation ID")):
    record = await faculty_allocation_service.get_by_id(id)
    return DataResponse(
        message="Faculty allocation retrieved successfully",
        data=FacultyAllocationResponse(**record),
    )


@router.put(
    "/{id}",
    response_model=DataResponse[FacultyAllocationResponse],
    summary="Update Faculty Allocation",
)
async def update_faculty_allocation(
    data: FacultyAllocationUpdate, id: str = Path(..., description="Allocation ID")
):
    record = await faculty_allocation_service.update(id, data)
    return DataResponse(
        message="Faculty allocation updated successfully",
        data=FacultyAllocationResponse(**record),
    )


@router.delete(
    "/{id}",
    response_model=BaseResponse,
    summary="Delete Faculty Allocation",
)
async def delete_faculty_allocation(id: str = Path(..., description="Allocation ID")):
    await faculty_allocation_service.delete(id)
    return BaseResponse(message="Faculty allocation deleted successfully")
