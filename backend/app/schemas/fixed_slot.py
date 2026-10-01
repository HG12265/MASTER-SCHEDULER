from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import BaseEntity


class FixedSlotCategory(str, Enum):
    SUBJECT = "SUBJECT"
    LIBRARY = "LIBRARY"
    SUPPORTIVE = "SUPPORTIVE"
    NET_SET = "NET_SET"
    ACTIVITY = "ACTIVITY"
    MEETING = "MEETING"
    OTHER = "OTHER"


class FixedSlotBase(BaseModel):
    academicYearId: str = Field(..., description="ID of the academic year")
    semesterTypeId: str = Field(..., description="ID of the semester type")
    classId: str = Field(..., description="ID of the class")
    workingDayId: str = Field(..., description="ID of the working day")
    timeSlotId: str = Field(..., description="ID of the time slot")
    slotCategory: str = Field(
        FixedSlotCategory.SUBJECT.value,
        description="SUBJECT, LIBRARY, SUPPORTIVE, NET_SET, ACTIVITY, MEETING, OTHER",
    )
    subjectId: Optional[str] = Field(None, description="Optional subject ID if category is SUBJECT")
    facultyIds: List[str] = Field(default_factory=list, description="Assigned faculty member IDs")
    resourceId: Optional[str] = Field(None, description="Optional fixed room or lab ID")
    title: Optional[str] = Field(None, max_length=150, description="Title/label (e.g. Library, NET Coaching)")
    description: Optional[str] = Field(None, max_length=300)
    isLocked: bool = Field(True, description="Locked slots cannot be shifted by the timetable solver")
    isActive: bool = Field(True, description="Record active status")

    @field_validator("slotCategory", mode="after")
    @classmethod
    def validate_category(cls, v: str) -> str:
        v_upper = v.strip().upper()
        allowed = {c.value for c in FixedSlotCategory}
        if v_upper not in allowed:
            raise ValueError(f"Invalid slotCategory '{v}'. Must be one of: {', '.join(allowed)}")
        return v_upper

    @field_validator("facultyIds", mode="after")
    @classmethod
    def clean_faculty_ids(cls, v: List[str]) -> List[str]:
        cleaned = [f.strip() for f in v if f and f.strip()]
        return list(dict.fromkeys(cleaned))


class FixedSlotCreate(FixedSlotBase):
    pass


class FixedSlotUpdate(BaseModel):
    slotCategory: Optional[str] = None
    subjectId: Optional[str] = None
    facultyIds: Optional[List[str]] = None
    resourceId: Optional[str] = None
    title: Optional[str] = Field(None, max_length=150)
    description: Optional[str] = Field(None, max_length=300)
    isLocked: Optional[bool] = None
    isActive: Optional[bool] = None

    @field_validator("slotCategory", mode="after")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_upper = v.strip().upper()
            allowed = {c.value for c in FixedSlotCategory}
            if v_upper not in allowed:
                raise ValueError(f"Invalid slotCategory '{v}'. Must be one of: {', '.join(allowed)}")
            return v_upper
        return v


class FixedSlotResponse(BaseEntity, FixedSlotBase):
    className: Optional[str] = None
    classDisplayName: Optional[str] = None
    dayName: Optional[str] = None
    dayOrder: Optional[int] = None
    timeSlotName: Optional[str] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    slotOrder: Optional[int] = None
    subjectName: Optional[str] = None
    subjectCode: Optional[str] = None
    facultyNames: List[str] = []
    resourceName: Optional[str] = None
    resourceCode: Optional[str] = None
