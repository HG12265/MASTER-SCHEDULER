from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class AuditLogCreate(BaseModel):
    userId: Optional[str] = None
    username: Optional[str] = None
    action: str = Field(..., description="Action name e.g. TIMETABLE_PUBLISHED, LEAVE_APPROVED")
    entityType: str = Field(..., description="Type of entity e.g. Timetable, LeaveRequest, User")
    entityId: Optional[str] = None
    description: str
    metadata: Optional[Dict[str, Any]] = None
    ipAddress: Optional[str] = None
    userAgent: Optional[str] = None


class AuditLogResponse(BaseModel):
    id: str
    userId: Optional[str] = None
    username: Optional[str] = None
    action: str
    entityType: str
    entityId: Optional[str] = None
    description: str
    metadata: Optional[Dict[str, Any]] = None
    ipAddress: Optional[str] = None
    userAgent: Optional[str] = None
    createdAt: str
