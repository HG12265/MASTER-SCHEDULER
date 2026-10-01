from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseEntity


class ClassConstraintBase(BaseModel):
    academicYearId: str = Field(..., description="ID of the academic year")
    semesterTypeId: str = Field(..., description="ID of the semester type")
    classId: str = Field(..., description="ID of the target class cohort")
    maxPeriodsPerDay: int = Field(6, ge=1, le=12, description="Daily class lecture limit")
    maxConsecutivePeriods: int = Field(3, ge=1, le=6, description="Max consecutive class periods before recess")
    allowFreePeriods: bool = Field(True, description="Allow empty / free slots during the day")
    preferredFreeSlotIds: List[str] = Field(default_factory=list, description="Time slot IDs preferred for class free periods")
    blockedSlotIds: List[str] = Field(default_factory=list, description="Time slot IDs where this class cannot be scheduled")
    notes: Optional[str] = Field(None, max_length=300)
    isActive: bool = Field(True, description="Record active status")


class ClassConstraintCreate(ClassConstraintBase):
    pass


class ClassConstraintUpdate(BaseModel):
    maxPeriodsPerDay: Optional[int] = Field(None, ge=1, le=12)
    maxConsecutivePeriods: Optional[int] = Field(None, ge=1, le=6)
    allowFreePeriods: Optional[bool] = None
    preferredFreeSlotIds: Optional[List[str]] = None
    blockedSlotIds: Optional[List[str]] = None
    notes: Optional[str] = Field(None, max_length=300)
    isActive: Optional[bool] = None


class ClassConstraintResponse(BaseEntity, ClassConstraintBase):
    className: Optional[str] = None
    classDisplayName: Optional[str] = None
    academicYearName: Optional[str] = None
    semesterTypeName: Optional[str] = None
