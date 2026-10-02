from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class NotificationCreate(BaseModel):
    userId: str
    type: str
    title: str
    message: str
    relatedEntityType: Optional[str] = None
    relatedEntityId: Optional[str] = None


class NotificationResponse(BaseModel):
    id: str
    userId: str
    type: str
    title: str
    message: str
    relatedEntityType: Optional[str] = None
    relatedEntityId: Optional[str] = None
    isRead: bool
    readAt: Optional[str] = None
    createdAt: str


class UnreadCountResponse(BaseModel):
    unreadCount: int
