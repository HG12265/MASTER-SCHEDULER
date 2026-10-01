from typing import List, Optional
from fastapi import APIRouter, Path, Query, status
from app.schemas.class_constraint import (
    ClassConstraintCreate,
    ClassConstraintUpdate,
    ClassConstraintResponse,
)
from app.schemas.common import BaseResponse, DataResponse
from app.services.class_constraint_service import class_constraint_service

router = APIRouter(prefix="/class-constraints", tags=["Class Constraints"])


@router.post(
    "",
    response_model=DataResponse[ClassConstraintResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Class Constraint Profile",
)
async def create_class_constraint(data: ClassConstraintCreate):
    record = await class_constraint_service.create(data)
    return DataResponse(
        message="Class constraint profile created successfully",
        data=ClassConstraintResponse(**record),
    )


@router.get(
    "",
    response_model=DataResponse[List[ClassConstraintResponse]],
    summary="List Class Constraints",
)
async def list_class_constraints(
    academicYearId: Optional[str] = Query(None, description="Filter by Academic Year ID"),
    semesterTypeId: Optional[str] = Query(None, description="Filter by Semester Type ID"),
    classId: Optional[str] = Query(None, description="Filter by Class ID"),
    isActive: Optional[bool] = Query(None, description="Filter by active status"),
):
    records = await class_constraint_service.list_constraints(
        academic_year_id=academicYearId,
        semester_type_id=semesterTypeId,
        class_id=classId,
        is_active=isActive,
    )
    return DataResponse(
        message="Class constraints retrieved successfully",
        data=[ClassConstraintResponse(**r) for r in records],
    )


@router.get(
    "/{id}",
    response_model=DataResponse[ClassConstraintResponse],
    summary="Get Class Constraint By ID",
)
async def get_class_constraint(
    id: str = Path(..., description="ID of class constraint profile"),
):
    record = await class_constraint_service.get_by_id(id)
    return DataResponse(
        message="Class constraint profile retrieved",
        data=ClassConstraintResponse(**record),
    )


@router.put(
    "/{id}",
    response_model=DataResponse[ClassConstraintResponse],
    summary="Update Class Constraint",
)
async def update_class_constraint(
    data: ClassConstraintUpdate,
    id: str = Path(..., description="ID of class constraint profile"),
):
    record = await class_constraint_service.update(id, data)
    return DataResponse(
        message="Class constraint profile updated successfully",
        data=ClassConstraintResponse(**record),
    )


@router.delete(
    "/{id}",
    response_model=BaseResponse,
    summary="Delete Class Constraint Profile",
)
async def delete_class_constraint(
    id: str = Path(..., description="ID of class constraint profile"),
):
    await class_constraint_service.delete(id)
    return BaseResponse(message="Class constraint profile deleted successfully")
