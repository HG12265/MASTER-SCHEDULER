from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseEntity


class SubjectConstraintBase(BaseModel):
    academicYearId: str = Field(..., description="ID of the academic year")
    semesterTypeId: str = Field(..., description="ID of the semester type")
    classId: str = Field(..., description="ID of the class cohort")
    subjectId: str = Field(..., description="ID of the subject")
    maxSessionsPerDay: int = Field(1, ge=1, le=4, description="Max times this subject can occur on any single day")
    minDaysBetweenSessions: int = Field(1, ge=0, le=5, description="Minimum gap days between scheduled sessions")
    preferredTimeSlotIds: List[str] = Field(default_factory=list, description="Preferred time slots (e.g. morning slots)")
    avoidTimeSlotIds: List[str] = Field(default_factory=list, description="Slots to avoid if possible (e.g. post-lunch)")
    preferredWorkingDayIds: List[str] = Field(default_factory=list, description="Preferred days for this subject")
    avoidWorkingDayIds: List[str] = Field(default_factory=list, description="Days to avoid for this subject")
    notes: Optional[str] = Field(None, max_length=300)
    isActive: bool = Field(True, description="Record active status")


class SubjectConstraintCreate(SubjectConstraintBase):
    pass


class SubjectConstraintUpdate(BaseModel):
    maxSessionsPerDay: Optional[int] = Field(None, ge=1, le=4)
    minDaysBetweenSessions: Optional[int] = Field(None, ge=0, le=5)
    preferredTimeSlotIds: Optional[List[str]] = None
    avoidTimeSlotIds: Optional[List[str]] = None
    preferredWorkingDayIds: Optional[List[str]] = None
    avoidWorkingDayIds: Optional[List[str]] = None
    notes: Optional[str] = Field(None, max_length=300)
    isActive: Optional[bool] = None


class SubjectConstraintResponse(BaseEntity, SubjectConstraintBase):
    className: Optional[str] = None
    subjectName: Optional[str] = None
    subjectCode: Optional[str] = None
    subjectType: Optional[str] = None
    academicYearName: Optional[str] = None
    semesterTypeName: Optional[str] = None
