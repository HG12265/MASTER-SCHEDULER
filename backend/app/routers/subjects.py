from typing import Optional
from fastapi import APIRouter, Path, Query, status
from app.schemas.subject import (
    SubjectCreate,
    SubjectUpdate,
    SubjectResponse,
)
from app.schemas.common import BaseResponse, DataResponse, PaginatedResponse
from app.services.subject_service import subject_service

router = APIRouter(prefix="/subjects", tags=["Subjects"])


@router.post(
    "",
    response_model=DataResponse[SubjectResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Subject",
)
async def create_subject(data: SubjectCreate):
    record = await subject_service.create(data)
    return DataResponse(
        message="Subject created successfully",
        data=SubjectResponse(**record),
    )


@router.get(
    "",
    response_model=PaginatedResponse[SubjectResponse],
    summary="List Subjects (with Filters, Search & Pagination)",
)
async def list_subjects(
    programmeId: Optional[str] = Query(None, description="Filter by Programme ID"),
    semesterId: Optional[str] = Query(None, description="Filter by Semester ID"),
    subjectType: Optional[str] = Query(None, description="Filter by Subject Type (THEORY, LAB, etc.)"),
    isActive: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by subject code or name"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=500, description="Items per page"),
):
    result = await subject_service.list_subjects(
        programmeId, semesterId, subjectType, isActive, search, page, limit
    )
    return PaginatedResponse(
        message="Subjects retrieved successfully",
        data=[SubjectResponse(**item) for item in result["items"]],
        pagination=result["pagination"],
    )


@router.get(
    "/{id}",
    response_model=DataResponse[SubjectResponse],
    summary="Get Subject by ID",
)
async def get_subject(id: str = Path(..., description="Subject ID")):
    record = await subject_service.get_by_id(id)
    return DataResponse(
        message="Subject retrieved successfully",
        data=SubjectResponse(**record),
    )


@router.put(
    "/{id}",
    response_model=DataResponse[SubjectResponse],
    summary="Update Subject",
)
async def update_subject(
    data: SubjectUpdate, id: str = Path(..., description="Subject ID")
):
    record = await subject_service.update(id, data)
    return DataResponse(
        message="Subject updated successfully",
        data=SubjectResponse(**record),
    )


@router.delete(
    "/{id}",
    response_model=BaseResponse,
    summary="Delete Subject",
)
async def delete_subject(id: str = Path(..., description="Subject ID")):
    await subject_service.delete(id)
    return BaseResponse(message="Subject deleted successfully")
