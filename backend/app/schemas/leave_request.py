from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field


class LeaveType(str, Enum):
    CASUAL = "CASUAL"
    MEDICAL = "MEDICAL"
    DUTY = "DUTY"
    ON_DUTY = "ON_DUTY"
    OTHER = "OTHER"


class LeaveStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class LeaveRequestCreate(BaseModel):
    facultyId: str
    leaveType: LeaveType = LeaveType.CASUAL
    startDate: str = Field(..., description="Start date YYYY-MM-DD")
    endDate: str = Field(..., description="End date YYYY-MM-DD")
    fullDay: bool = True
    affectedTimeSlotIds: Optional[List[str]] = Field(default_factory=list)
    reason: str = Field(..., min_length=3, max_length=500)


class LeaveRequestReview(BaseModel):
    reviewNotes: Optional[str] = None


class AffectedPeriodItem(BaseModel):
    date: str
    entryId: str
    timetableId: str
    classId: str
    className: str
    subjectId: str
    subjectName: str
    subjectCode: str
    timeSlotId: str
    timeSlotName: str
    startTime: str
    endTime: str
    slotOrder: int
    workingDayId: str
    workingDayName: str
    resourceId: Optional[str] = None
    resourceName: Optional[str] = None
    coFacultyIds: List[str] = Field(default_factory=list)
    coFacultyNames: List[str] = Field(default_factory=list)
    isMultiFaculty: bool = False
    substitutionStatus: Optional[str] = None
    substituteFacultyId: Optional[str] = None
    substituteFacultyName: Optional[str] = None


class LeaveImpactResponse(BaseModel):
    leaveRequestId: Optional[str] = None
    facultyId: str
    facultyName: str
    facultyCode: str
    startDate: str
    endDate: str
    totalTeachingDays: int
    totalAffectedPeriods: int
    affectedPeriods: List[AffectedPeriodItem]


class LeaveRequestResponse(BaseModel):
    id: str
    facultyId: str
    facultyName: Optional[str] = None
    facultyCode: Optional[str] = None
    department: Optional[str] = None
    leaveType: str
    startDate: str
    endDate: str
    fullDay: bool
    affectedTimeSlotIds: List[str] = Field(default_factory=list)
    reason: str
    status: str
    requestedAt: Optional[str] = None
    reviewedAt: Optional[str] = None
    reviewedBy: Optional[str] = None
    reviewNotes: Optional[str] = None
    affectedPeriodsCount: Optional[int] = None
    isActive: bool = True
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
