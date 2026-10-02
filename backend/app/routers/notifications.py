from typing import List
from fastapi import APIRouter, Depends, Query, status
from app.schemas.notification import NotificationResponse, UnreadCountResponse
from app.services.notification_service import notification_service
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse], summary="Get User Notifications")
async def get_notifications(
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """
    Get recent notifications for the logged in user.
    """
    user_id = str(current_user.get("id") or current_user.get("_id"))
    return await notification_service.get_user_notifications(user_id, limit=limit)


@router.get("/unread-count", response_model=UnreadCountResponse, summary="Get Unread Count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """
    Get unread notification count for badge display.
    """
    user_id = str(current_user.get("id") or current_user.get("_id"))
    count = await notification_service.get_unread_count(user_id)
    return UnreadCountResponse(unreadCount=count)


@router.patch("/{id}/read", status_code=status.HTTP_200_OK, summary="Mark Notification Read")
async def mark_notification_read(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Mark a specific notification as read.
    """
    user_id = str(current_user.get("id") or current_user.get("_id"))
    success = await notification_service.mark_as_read(id, user_id)
    return {"success": success}


@router.patch("/read-all", status_code=status.HTTP_200_OK, summary="Mark All Read")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    """
    Mark all notifications for current user as read.
    """
    user_id = str(current_user.get("id") or current_user.get("_id"))
    count = await notification_service.mark_all_as_read(user_id)
    return {"success": True, "markedCount": count}
