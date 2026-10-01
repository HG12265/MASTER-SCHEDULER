from typing import List, Optional
from fastapi import APIRouter, Path, Query, status
from app.schemas.subject_constraint import (
    SubjectConstraintCreate,
    SubjectConstraintUpdate,
    SubjectConstraintResponse,
)
from app.schemas.common import BaseResponse, DataResponse
from app.services.subject_constraint_service import subject_constraint_service

router = APIRouter(prefix="/subject-constraints", tags=["Subject Preferences"])


@router.post(
    "",
    response_model=DataResponse[SubjectConstraintResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Subject Preference Profile",
)
async def create_subject_constraint(data: SubjectConstraintCreate):
    record = await subject_constraint_service.create(data)
    return DataResponse(
        message="Subject scheduling preference profile created successfully",
        data=SubjectConstraintResponse(**record),
    )


@router.get(
    "",
    response_model=DataResponse[List[SubjectConstraintResponse]],
    summary="List Subject Preferences",
)
async def list_subject_constraints(
    academicYearId: Optional[str] = Query(None, description="Filter by Academic Year ID"),
    semesterTypeId: Optional[str] = Query(None, description="Filter by Semester Type ID"),
    classId: Optional[str] = Query(None, description="Filter by Class ID"),
    subjectId: Optional[str] = Query(None, description="Filter by Subject ID"),
    isActive: Optional[bool] = Query(None, description="Filter by active status"),
):
    records = await subject_constraint_service.list_constraints(
        academic_year_id=academicYearId,
        semester_type_id=semesterTypeId,
        class_id=classId,
        subject_id=subjectId,
        is_active=isActive,
    )
    return DataResponse(
        message="Subject preferences retrieved successfully",
        data=[SubjectConstraintResponse(**r) for r in records],
    )


@router.get(
    "/{id}",
    response_model=DataResponse[SubjectConstraintResponse],
    summary="Get Subject Preference By ID",
)
async def get_subject_constraint(
    id: str = Path(..., description="ID of subject preference profile"),
):
    record = await subject_constraint_service.get_by_id(id)
    return DataResponse(
        message="Subject preference profile retrieved",
        data=SubjectConstraintResponse(**record),
    )


@router.put(
    "/{id}",
    response_model=DataResponse[SubjectConstraintResponse],
    summary="Update Subject Preference",
)
async def update_subject_constraint(
    data: SubjectConstraintUpdate,
    id: str = Path(..., description="ID of subject preference profile"),
):
    record = await subject_constraint_service.update(id, data)
    return DataResponse(
        message="Subject preference profile updated successfully",
        data=SubjectConstraintResponse(**record),
    )


@router.delete(
    "/{id}",
    response_model=BaseResponse,
    summary="Delete Subject Preference Profile",
)
async def delete_subject_constraint(
    id: str = Path(..., description="ID of subject preference profile"),
):
    await subject_constraint_service.delete(id)
    return BaseResponse(message="Subject preference profile deleted successfully")
