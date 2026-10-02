from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from app.schemas.substitution import (
    SubstitutionCreate,
    SubstitutionResponse,
    SubstitutionCandidateResponse,
    EmergencyAbsenceCreate,
)
from app.schemas.rbac import Permission
from app.services.substitution_service import substitution_service
from app.middleware.auth import require_permission, get_current_user

router = APIRouter(prefix="/substitutions", tags=["Substitute Management"])


@router.get("/candidates", response_model=SubstitutionCandidateResponse, summary="Recommend Substitute Candidates")
async def get_substitute_candidates(
    date: str = Query(..., description="Target date YYYY-MM-DD"),
    entryId: str = Query(..., description="Timetable entry ID to find substitute for"),
    current_user: dict = Depends(require_permission(Permission.SUBSTITUTION_MANAGE)),
):
    """
    Find and rank eligible substitute candidates based on availability, workload, and subject/class allocations.
    """
    return await substitution_service.find_candidates(date_str=date, entry_id=entryId)


@router.post("", response_model=SubstitutionResponse, status_code=status.HTTP_201_CREATED, summary="Assign Substitute")
async def assign_substitute(
    payload: SubstitutionCreate,
    current_user: dict = Depends(require_permission(Permission.SUBSTITUTION_MANAGE)),
):
    """
    Assign a substitute faculty or mark period cancelled/activity for a specific date.
    Performs conflict checks. Does NOT mutate the official published weekly timetable.
    """
    return await substitution_service.assign_substitution(payload, current_user=current_user)


@router.get("", response_model=List[SubstitutionResponse], summary="List Substitutions")
async def list_substitutions(
    date: Optional[str] = Query(None, description="Filter by date YYYY-MM-DD"),
    facultyId: Optional[str] = Query(None, description="Filter by faculty ID (absent or substitute)"),
    classId: Optional[str] = Query(None, description="Filter by class ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: dict = Depends(get_current_user),
):
    """
    List temporary substitutions and operational overrides.
    """
    return await substitution_service.list_substitutions(
        date_filter=date,
        faculty_id=facultyId,
        class_id=classId,
        status_filter=status,
    )


@router.patch("/{id}/cancel", response_model=SubstitutionResponse, summary="Cancel Substitution")
async def cancel_substitution(
    id: str,
    current_user: dict = Depends(require_permission(Permission.SUBSTITUTION_MANAGE)),
):
    """
    Cancel a previously assigned substitution.
    """
    return await substitution_service.cancel_substitution(id, current_user=current_user)


@router.post("/emergency-absence", status_code=status.HTTP_201_CREATED, summary="Emergency Faculty Absence")
async def emergency_faculty_absence(
    payload: EmergencyAbsenceCreate,
    current_user: dict = Depends(require_permission(Permission.LEAVE_MANAGE)),
):
    """
    Emergency workflow: Mark faculty absent today, automatically create approved leave,
    and return affected sessions ready for substitute assignment.
    """
    return await substitution_service.emergency_faculty_absence(payload, current_user=current_user)
