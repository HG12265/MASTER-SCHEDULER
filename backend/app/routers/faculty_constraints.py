from typing import List, Optional
from fastapi import APIRouter, Path, Query, status
from app.schemas.faculty_constraint import (
    FacultyConstraintCreate,
    FacultyConstraintUpdate,
    FacultyConstraintResponse,
)
from app.schemas.common import BaseResponse, DataResponse
from app.services.faculty_constraint_service import faculty_constraint_service

router = APIRouter(prefix="/faculty-constraints", tags=["Faculty Constraints"])


@router.post(
    "",
    response_model=DataResponse[FacultyConstraintResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Faculty Constraint Profile",
)
async def create_faculty_constraint(data: FacultyConstraintCreate):
    record = await faculty_constraint_service.create(data)
    return DataResponse(
        message="Faculty scheduling preference profile created successfully",
        data=FacultyConstraintResponse(**record),
    )


@router.get(
    "",
    response_model=DataResponse[List[FacultyConstraintResponse]],
    summary="List Faculty Constraints",
)
async def list_faculty_constraints(
    academicYearId: Optional[str] = Query(None, description="Filter by Academic Year ID"),
    semesterTypeId: Optional[str] = Query(None, description="Filter by Semester Type ID"),
    facultyId: Optional[str] = Query(None, description="Filter by Faculty ID"),
    isActive: Optional[bool] = Query(None, description="Filter by active status"),
):
    records = await faculty_constraint_service.list_constraints(
        academic_year_id=academicYearId,
        semester_type_id=semesterTypeId,
        faculty_id=facultyId,
        is_active=isActive,
    )
    return DataResponse(
        message="Faculty constraints retrieved successfully",
        data=[FacultyConstraintResponse(**r) for r in records],
    )


@router.get(
    "/{id}",
    response_model=DataResponse[FacultyConstraintResponse],
    summary="Get Faculty Constraint By ID",
)
async def get_faculty_constraint(
    id: str = Path(..., description="ID of faculty constraint profile"),
):
    record = await faculty_constraint_service.get_by_id(id)
    return DataResponse(
        message="Faculty constraint profile retrieved",
        data=FacultyConstraintResponse(**record),
    )


@router.put(
    "/{id}",
    response_model=DataResponse[FacultyConstraintResponse],
    summary="Update Faculty Constraint",
)
async def update_faculty_constraint(
    data: FacultyConstraintUpdate,
    id: str = Path(..., description="ID of faculty constraint profile"),
):
    record = await faculty_constraint_service.update(id, data)
    return DataResponse(
        message="Faculty constraint profile updated successfully",
        data=FacultyConstraintResponse(**record),
    )


@router.delete(
    "/{id}",
    response_model=BaseResponse,
    summary="Delete Faculty Constraint Profile",
)
async def delete_faculty_constraint(
    id: str = Path(..., description="ID of faculty constraint profile"),
):
    await faculty_constraint_service.delete(id)
    return BaseResponse(message="Faculty constraint profile deleted successfully")
