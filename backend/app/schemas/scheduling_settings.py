from typing import Dict, Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import BaseEntity

DEFAULT_SOFT_WEIGHTS = {
    "subjectDistribution": 8,
    "facultyLoadBalance": 7,
    "avoidConsecutiveHours": 6,
    "preferredAvailability": 8,
    "avoidAvailability": 5,
    "avoidLastPeriod": 3,
}


class SchedulingSettingsBase(BaseModel):
    academicYearId: str = Field(..., description="ID of the academic year")
    semesterTypeId: str = Field(..., description="ID of the semester type")
    maxFacultyHoursPerDay: int = Field(4, ge=1, le=10, description="Global default max faculty teaching hours per day")
    maxFacultyConsecutiveHours: int = Field(2, ge=1, le=6, description="Global default max consecutive hours for faculty")
    maxClassConsecutiveHours: int = Field(3, ge=1, le=6, description="Max consecutive class periods before recess")
    avoidSameSubjectMultipleTimesPerDay: bool = Field(True, description="Avoid scheduling same subject twice in one day")
    distributeSubjectsAcrossWeek: bool = Field(True, description="Distribute course lectures across distinct days")
    balanceFacultyDailyLoad: bool = Field(True, description="Evenly distribute faculty periods across teaching days")
    preferLabsInBlocks: bool = Field(True, description="Schedule laboratory sessions in continuous blocks")
    avoidFirstPeriodForFaculty: bool = Field(False, description="Prefer assigning periods after period 1 for faculty")
    avoidLastPeriodForFaculty: bool = Field(False, description="Prefer not scheduling faculty in the last period")
    allowFreePeriodsForClasses: bool = Field(True, description="Permit gap periods within student class timetables")
    allowUnassignedSlots: bool = Field(False, description="Allow unfilled timetable slots if capacity permits")
    softConstraintWeights: Dict[str, int] = Field(
        default_factory=lambda: dict(DEFAULT_SOFT_WEIGHTS),
        description="Soft constraint priority weights from 1 (lowest) to 10 (highest)",
    )
    isActive: bool = Field(True, description="Record active status")

    @field_validator("softConstraintWeights", mode="after")
    @classmethod
    def validate_weights(cls, v: Dict[str, int]) -> Dict[str, int]:
        validated = {}
        for key, val in v.items():
            if not isinstance(val, int) or val < 1 or val > 10:
                raise ValueError(f"Priority weight for '{key}' must be an integer between 1 and 10 (got {val})")
            validated[key] = val
        return validated


class SchedulingSettingsCreate(SchedulingSettingsBase):
    pass


class SchedulingSettingsUpdate(BaseModel):
    maxFacultyHoursPerDay: Optional[int] = Field(None, ge=1, le=10)
    maxFacultyConsecutiveHours: Optional[int] = Field(None, ge=1, le=6)
    maxClassConsecutiveHours: Optional[int] = Field(None, ge=1, le=6)
    avoidSameSubjectMultipleTimesPerDay: Optional[bool] = None
    distributeSubjectsAcrossWeek: Optional[bool] = None
    balanceFacultyDailyLoad: Optional[bool] = None
    preferLabsInBlocks: Optional[bool] = None
    avoidFirstPeriodForFaculty: Optional[bool] = None
    avoidLastPeriodForFaculty: Optional[bool] = None
    allowFreePeriodsForClasses: Optional[bool] = None
    allowUnassignedSlots: Optional[bool] = None
    softConstraintWeights: Optional[Dict[str, int]] = None
    isActive: Optional[bool] = None

    @field_validator("softConstraintWeights", mode="after")
    @classmethod
    def validate_weights(cls, v: Optional[Dict[str, int]]) -> Optional[Dict[str, int]]:
        if v is not None:
            validated = {}
            for key, val in v.items():
                if not isinstance(val, int) or val < 1 or val > 10:
                    raise ValueError(f"Priority weight for '{key}' must be an integer between 1 and 10 (got {val})")
                validated[key] = val
            return validated
        return v


class SchedulingSettingsResponse(BaseEntity, SchedulingSettingsBase):
    academicYearName: Optional[str] = None
    semesterTypeName: Optional[str] = None
