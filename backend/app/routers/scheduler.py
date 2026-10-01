from fastapi import APIRouter, Query, status
from typing import Any, Dict
from app.schemas.common import DataResponse
from app.schemas.scheduler_validation import (
    SchedulerValidateRequest,
    SchedulerValidationResult,
    SchedulerReadinessResponse,
)
from app.schemas.timetable import TimetableGenerateRequest, TimetableResponse
from app.services.scheduler_validation_service import scheduler_validation_service
from app.services.timetable_generation_service import timetable_generation_service

router = APIRouter(prefix="/scheduler", tags=["Scheduler Pre-Generation Validation & Generation"])


@router.post(
    "/validate",
    response_model=DataResponse[SchedulerValidationResult],
    status_code=status.HTTP_200_OK,
    summary="Validate Scheduling Configuration & Readiness",
    description="Runs 20 thorough structural, workload, conflict, and capacity checks for the specified term without generating a schedule.",
)
async def validate_term(request: SchedulerValidateRequest):
    result = await scheduler_validation_service.validate_term(
        academic_year_id=request.academicYearId,
        semester_type_id=request.semesterTypeId,
    )
    return DataResponse(
        message="Scheduling validation analysis completed",
        data=result,
    )


@router.get(
    "/readiness",
    response_model=DataResponse[SchedulerReadinessResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Scheduler Pre-Generation Readiness Summary",
    description="Returns aggregate entity counts, fixed slots, unavailable slots, error/warning tally, and overall readiness boolean.",
)
async def get_readiness(
    academicYearId: str = Query(..., description="ID of Academic Year"),
    semesterTypeId: str = Query(..., description="ID of Semester Type"),
):
    readiness = await scheduler_validation_service.get_readiness(
        academic_year_id=academicYearId,
        semester_type_id=semesterTypeId,
    )
    return DataResponse(
        message="Scheduler readiness summary retrieved",
        data=readiness,
    )


@router.post(
    "/generate",
    response_model=DataResponse[Any],
    status_code=status.HTTP_200_OK,
    summary="Generate University Timetable using Google OR-Tools CP-SAT",
    description="Executes pre-validation, constructs multi-class CP-SAT optimization model, enforces all hard invariants, maximizes soft objectives, and persists versioned conflict-free timetable.",
)
async def generate_timetable(request: TimetableGenerateRequest):
    res = await timetable_generation_service.generate(request)
    if not res.get("success"):
        return DataResponse(
            success=False,
            message=res.get("message", "Timetable generation failed"),
            data=res,
        )
    return DataResponse(
        success=True,
        message=res.get("message", "Timetable generated successfully"),
        data=res.get("timetable"),
    )

