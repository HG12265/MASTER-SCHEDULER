from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import BaseEntity


class AvailabilityStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    UNAVAILABLE = "UNAVAILABLE"
    PREFERRED = "PREFERRED"
    AVOID = "AVOID"


class FacultyAvailabilityBase(BaseModel):
    academicYearId: str = Field(..., description="ID of the academic year")
    semesterTypeId: str = Field(..., description="ID of the semester type")
    facultyId: str = Field(..., description="ID of the faculty member")
    workingDayId: str = Field(..., description="ID of the working day")
    timeSlotId: str = Field(..., description="ID of the time slot")
    availabilityStatus: str = Field(
        AvailabilityStatus.AVAILABLE.value,
        description="AVAILABLE, UNAVAILABLE (hard), PREFERRED (soft), AVOID (soft)",
    )
    reason: Optional[str] = Field(None, max_length=200, description="e.g. Dean duties, Research seminar")
    notes: Optional[str] = Field(None, max_length=300)
    isActive: bool = Field(True, description="Record active status")

    @field_validator("availabilityStatus", mode="after")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v_upper = v.strip().upper()
        allowed = {s.value for s in AvailabilityStatus}
        if v_upper not in allowed:
            raise ValueError(f"Invalid availabilityStatus '{v}'. Must be one of: {', '.join(allowed)}")
        return v_upper


class FacultyAvailabilityCreate(FacultyAvailabilityBase):
    pass


class FacultyAvailabilityUpdate(BaseModel):
    availabilityStatus: Optional[str] = None
    reason: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=300)
    isActive: Optional[bool] = None

    @field_validator("availabilityStatus", mode="after")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_upper = v.strip().upper()
            allowed = {s.value for s in AvailabilityStatus}
            if v_upper not in allowed:
                raise ValueError(f"Invalid availabilityStatus '{v}'. Must be one of: {', '.join(allowed)}")
            return v_upper
        return v


class FacultyAvailabilityResponse(BaseEntity, FacultyAvailabilityBase):
    facultyName: Optional[str] = None
    facultyCode: Optional[str] = None
    dayName: Optional[str] = None
    dayOrder: Optional[int] = None
    timeSlotName: Optional[str] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    slotOrder: Optional[int] = None


class FacultyAvailabilityEntry(BaseModel):
    workingDayId: str = Field(..., description="ID of the working day")
    timeSlotId: str = Field(..., description="ID of the time slot")
    availabilityStatus: str = Field(..., description="AVAILABLE, UNAVAILABLE, PREFERRED, AVOID")
    reason: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("availabilityStatus", mode="after")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v_upper = v.strip().upper()
        allowed = {s.value for s in AvailabilityStatus}
        if v_upper not in allowed:
            raise ValueError(f"Invalid availabilityStatus '{v}'. Must be one of: {', '.join(allowed)}")
        return v_upper


class FacultyAvailabilityBulkUpdate(BaseModel):
    academicYearId: str = Field(..., description="ID of the academic year")
    semesterTypeId: str = Field(..., description="ID of the semester type")
    facultyId: str = Field(..., description="ID of the faculty member")
    entries: List[FacultyAvailabilityEntry] = Field(
        ..., description="List of slot availability configurations"
    )
