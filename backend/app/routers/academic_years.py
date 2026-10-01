from typing import List
from fastapi import APIRouter, Path, status
from app.schemas.academic_year import (
    AcademicYearCreate,
    AcademicYearUpdate,
    AcademicYearResponse,
)
from app.schemas.common import BaseResponse, DataResponse
from app.services.academic_year_service import academic_year_service

router = APIRouter(prefix="/academic-years", tags=["Academic Years"])


@router.post(
    "",
    response_model=DataResponse[AcademicYearResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Academic Year",
)
async def create_academic_year(data: AcademicYearCreate):
    record = await academic_year_service.create(data)
    return DataResponse(
        message="Academic year created successfully",
        data=AcademicYearResponse(**record),
    )


@router.get(
    "",
    response_model=DataResponse[List[AcademicYearResponse]],
    summary="List All Academic Years",
)
async def list_academic_years():
    records = await academic_year_service.list_all()
    return DataResponse(
        message="Academic years retrieved successfully",
        data=[AcademicYearResponse(**r) for r in records],
    )


@router.get(
    "/{id}",
    response_model=DataResponse[AcademicYearResponse],
    summary="Get Academic Year by ID",
)
async def get_academic_year(id: str = Path(..., description="Academic Year ID")):
    record = await academic_year_service.get_by_id(id)
    return DataResponse(
        message="Academic year retrieved successfully",
        data=AcademicYearResponse(**record),
    )


@router.put(
    "/{id}",
    response_model=DataResponse[AcademicYearResponse],
    summary="Update Academic Year",
)
async def update_academic_year(
    data: AcademicYearUpdate, id: str = Path(..., description="Academic Year ID")
):
    record = await academic_year_service.update(id, data)
    return DataResponse(
        message="Academic year updated successfully",
        data=AcademicYearResponse(**record),
    )


@router.delete(
    "/{id}",
    response_model=BaseResponse,
    summary="Delete Academic Year",
)
async def delete_academic_year(id: str = Path(..., description="Academic Year ID")):
    await academic_year_service.delete(id)
    return BaseResponse(message="Academic year deleted successfully")


@router.patch(
    "/{id}/set-current",
    response_model=DataResponse[AcademicYearResponse],
    summary="Set Academic Year as Current Active Term",
)
async def set_current_academic_year(id: str = Path(..., description="Academic Year ID")):
    record = await academic_year_service.set_current(id)
    return DataResponse(
        message="Academic year set as current active year successfully",
        data=AcademicYearResponse(**record),
    )
