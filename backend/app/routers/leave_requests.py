from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from app.schemas.leave_request import (
    LeaveRequestCreate,
    LeaveRequestReview,
    LeaveRequestResponse,
    LeaveImpactResponse,
)
from app.schemas.rbac import Permission
from app.services.leave_request_service import leave_request_service
from app.middleware.auth import require_permission, get_current_user

router = APIRouter(prefix="/leave-requests", tags=["Faculty Leave Management"])


@router.get("", response_model=List[LeaveRequestResponse], summary="List Leave Requests")
async def list_leave_requests(
    facultyId: Optional[str] = Query(None, description="Filter by faculty ID"),
    status: Optional[str] = Query(None, description="Filter by status (PENDING, APPROVED, REJECTED, CANCELLED)"),
    startDate: Optional[str] = Query(None, description="Filter start date YYYY-MM-DD"),
    endDate: Optional[str] = Query(None, description="Filter end date YYYY-MM-DD"),
    current_user: dict = Depends(get_current_user),
):
    """
    List faculty leave requests.
    Faculty can view their own leave requests; administrators can view all.
    """
    # If faculty role, restrict to their own facultyId unless they have leave.manage
    user_role = current_user.get("role", "")
    target_faculty_id = facultyId
    if user_role == "FACULTY" and current_user.get("facultyId"):
        target_faculty_id = current_user.get("facultyId")

    return await leave_request_service.list_leave_requests(
        faculty_id=target_faculty_id,
        status_filter=status,
        start_date=startDate,
        end_date=endDate,
    )


@router.post("", response_model=LeaveRequestResponse, status_code=status.HTTP_201_CREATED, summary="Submit Leave Request")
async def create_leave_request(
    payload: LeaveRequestCreate,
    current_user: dict = Depends(require_permission(Permission.LEAVE_REQUEST)),
):
    """
    Submit a new leave request. Does NOT modify the published timetable.
    Requires leave.request permission.
    """
    return await leave_request_service.create_leave_request(payload, current_user=current_user)


@router.post("/preview-impact", response_model=LeaveImpactResponse, summary="Preview Leave Impact")
async def preview_leave_impact(
    payload: LeaveRequestCreate,
    current_user: dict = Depends(require_permission(Permission.LEAVE_REQUEST)),
):
    """
    Analyze affected published timetable sessions before creating a leave request.
    """
    return await leave_request_service.calculate_impact(
        faculty_id=payload.facultyId,
        start_date_str=payload.startDate,
        end_date_str=payload.endDate,
        full_day=payload.fullDay,
        affected_slot_ids=payload.affectedTimeSlotIds,
    )


@router.get("/{id}", response_model=LeaveRequestResponse, summary="Get Leave Request Details")
async def get_leave_request(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get full details of a specific leave request.
    """
    return await leave_request_service.get_by_id(id)


@router.get("/{id}/impact", response_model=LeaveImpactResponse, summary="Analyze Leave Timetable Impact")
async def get_leave_impact(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Identify all affected periods, classes, subjects, and co-faculty in published timetables.
    """
    return await leave_request_service.get_leave_impact(id)


@router.post("/{id}/approve", response_model=LeaveRequestResponse, summary="Approve Leave Request")
async def approve_leave_request(
    id: str,
    review: Optional[LeaveRequestReview] = None,
    current_user: dict = Depends(require_permission(Permission.LEAVE_MANAGE)),
):
    """
    Approve faculty leave. Identifies operational impact for substitution. Requires leave.manage.
    """
    notes = review.reviewNotes if review else None
    return await leave_request_service.approve_leave_request(id, review_notes=notes, current_user=current_user)


@router.post("/{id}/reject", response_model=LeaveRequestResponse, summary="Reject Leave Request")
async def reject_leave_request(
    id: str,
    review: Optional[LeaveRequestReview] = None,
    current_user: dict = Depends(require_permission(Permission.LEAVE_MANAGE)),
):
    """
    Reject faculty leave request. Requires leave.manage.
    """
    notes = review.reviewNotes if review else None
    return await leave_request_service.reject_leave_request(id, review_notes=notes, current_user=current_user)


@router.post("/{id}/cancel", response_model=LeaveRequestResponse, summary="Cancel Leave Request")
async def cancel_leave_request(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Cancel an existing leave request. Cancels any associated substitute assignments.
    """
    return await leave_request_service.cancel_leave_request(id, current_user=current_user)
