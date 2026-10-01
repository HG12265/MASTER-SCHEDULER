from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator
from app.schemas.common import BaseEntity


class FacultyAllocationBase(BaseModel):
    academicYearId: str = Field(..., description="ID of the academic year")
    semesterTypeId: str = Field(..., description="ID of the semester type (ODD/EVEN)")
    classId: str = Field(..., description="ID of the class")
    subjectId: str = Field(..., description="ID of the subject")
    facultyIds: List[str] = Field(..., min_length=1, description="List of faculty member IDs (supports multiple faculty for labs)")
    weeklyHours: int = Field(..., ge=1, le=40, description="Total periods assigned per week")
    blockSize: int = Field(1, ge=1, le=6, description="Continuous periods per scheduled block (1 for theory, 2-3 for lab)")
    requiresConsecutivePeriods: bool = Field(False, description="Whether classes must be consecutive")
    preferredResourceId: Optional[str] = Field(None, description="Optional preferred room or lab ID")
    notes: Optional[str] = Field(None, max_length=300)
    isActive: bool = Field(True, description="Record active status")

    @field_validator("facultyIds", mode="after")
    @classmethod
    def clean_faculty_ids(cls, v: List[str]) -> List[str]:
        cleaned = [f.strip() for f in v if f and f.strip()]
        if not cleaned:
            raise ValueError("At least one valid faculty ID must be allocated")
        # Remove duplicates preserving order
        return list(dict.fromkeys(cleaned))

    @model_validator(mode="after")
    def validate_allocation(self):
        if self.requiresConsecutivePeriods and self.blockSize <= 1:
            # If consecutive periods is requested, block size should logically be at least 2 or equal to weeklyHours
            pass
        if self.blockSize > self.weeklyHours:
            raise ValueError(f"blockSize ({self.blockSize}) cannot exceed weeklyHours ({self.weeklyHours})")
        return self


class FacultyAllocationCreate(FacultyAllocationBase):
    pass


class FacultyAllocationUpdate(BaseModel):
    academicYearId: Optional[str] = None
    semesterTypeId: Optional[str] = None
    classId: Optional[str] = None
    subjectId: Optional[str] = None
    facultyIds: Optional[List[str]] = None
    weeklyHours: Optional[int] = Field(None, ge=1, le=40)
    blockSize: Optional[int] = Field(None, ge=1, le=6)
    requiresConsecutivePeriods: Optional[bool] = None
    preferredResourceId: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=300)
    isActive: Optional[bool] = None

    @field_validator("facultyIds", mode="after")
    @classmethod
    def clean_faculty_ids(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            cleaned = [f.strip() for f in v if f and f.strip()]
            if not cleaned:
                raise ValueError("At least one valid faculty ID must be allocated")
            return list(dict.fromkeys(cleaned))
        return None

    @model_validator(mode="after")
    def validate_update(self):
        if self.blockSize is not None and self.weeklyHours is not None:
            if self.blockSize > self.weeklyHours:
                raise ValueError("blockSize cannot exceed weeklyHours")
        return self


class FacultyAllocationResponse(BaseEntity, FacultyAllocationBase):
    className: Optional[str] = None
    subjectName: Optional[str] = None
    subjectCode: Optional[str] = None
    facultyNames: List[str] = Field(default_factory=list)
    academicYearName: Optional[str] = None
    semesterTypeName: Optional[str] = None
    preferredResourceName: Optional[str] = None
