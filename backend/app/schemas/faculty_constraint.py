from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseEntity


class FacultyConstraintBase(BaseModel):
    academicYearId: str = Field(..., description="ID of the academic year")
    semesterTypeId: str = Field(..., description="ID of the semester type")
    facultyId: str = Field(..., description="ID of the faculty member")
    preferredMaxHoursPerDay: Optional[int] = Field(None, ge=1, le=10, description="Soft preference for maximum daily hours")
    preferredMinHoursPerDay: Optional[int] = Field(None, ge=0, le=8, description="Soft preference for minimum daily hours")
    avoidFirstPeriod: bool = Field(False, description="Prefer avoiding early morning first period")
    avoidLastPeriod: bool = Field(False, description="Prefer avoiding late afternoon last period")
    preferCompactSchedule: bool = Field(True, description="Prefer clustered periods without scattered gaps")
    minimumGapBetweenSessions: int = Field(0, ge=0, le=4, description="Preferred free periods between teaching blocks")
    notes: Optional[str] = Field(None, max_length=300)
    isActive: bool = Field(True, description="Record active status")


class FacultyConstraintCreate(FacultyConstraintBase):
    pass


class FacultyConstraintUpdate(BaseModel):
    preferredMaxHoursPerDay: Optional[int] = Field(None, ge=1, le=10)
    preferredMinHoursPerDay: Optional[int] = Field(None, ge=0, le=8)
    avoidFirstPeriod: Optional[bool] = None
    avoidLastPeriod: Optional[bool] = None
    preferCompactSchedule: Optional[bool] = None
    minimumGapBetweenSessions: Optional[int] = Field(None, ge=0, le=4)
    notes: Optional[str] = Field(None, max_length=300)
    isActive: Optional[bool] = None


class FacultyConstraintResponse(BaseEntity, FacultyConstraintBase):
    facultyName: Optional[str] = None
    facultyCode: Optional[str] = None
    maxHoursPerWeek: Optional[int] = None
    maxHoursPerDay: Optional[int] = None
    maxConsecutiveHours: Optional[int] = None
    academicYearName: Optional[str] = None
    semesterTypeName: Optional[str] = None
