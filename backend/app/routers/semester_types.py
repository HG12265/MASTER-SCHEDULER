from typing import List
from fastapi import APIRouter, Path, status
from app.schemas.semester_type import (
    SemesterTypeCreate,
    SemesterTypeUpdate,
    SemesterTypeResponse,
)
from app.schemas.common import BaseResponse, DataResponse
from app.services.semester_type_service import semester_type_service

router = APIRouter(prefix="/semester-types", tags=["Semester Types"])


@router.post(
    "",
    response_model=DataResponse[SemesterTypeResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Semester Type",
)
async def create_semester_type(data: SemesterTypeCreate):
    record = await semester_type_service.create(data)
    return DataResponse(
        message="Semester type created successfully",
        data=SemesterTypeResponse(**record),
    )


@router.get(
    "",
    response_model=DataResponse[List[SemesterTypeResponse]],
    summary="List All Semester Types",
)
async def list_semester_types():
    records = await semester_type_service.list_all()
    return DataResponse(
        message="Semester types retrieved successfully",
        data=[SemesterTypeResponse(**r) for r in records],
    )


@router.get(
    "/{id}",
    response_model=DataResponse[SemesterTypeResponse],
    summary="Get Semester Type by ID",
)
async def get_semester_type(id: str = Path(..., description="Semester Type ID")):
    record = await semester_type_service.get_by_id(id)
    return DataResponse(
        message="Semester type retrieved successfully",
        data=SemesterTypeResponse(**record),
    )


@router.put(
    "/{id}",
    response_model=DataResponse[SemesterTypeResponse],
    summary="Update Semester Type",
)
async def update_semester_type(
    data: SemesterTypeUpdate, id: str = Path(..., description="Semester Type ID")
):
    record = await semester_type_service.update(id, data)
    return DataResponse(
        message="Semester type updated successfully",
        data=SemesterTypeResponse(**record),
    )


@router.delete(
    "/{id}",
    response_model=BaseResponse,
    summary="Delete Semester Type",
)
async def delete_semester_type(id: str = Path(..., description="Semester Type ID")):
    await semester_type_service.delete(id)
    return BaseResponse(message="Semester type deleted successfully")
