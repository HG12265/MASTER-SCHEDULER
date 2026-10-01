from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import BaseEntity


class SubjectBase(BaseModel):
    subjectCode: str = Field(..., min_length=1, max_length=30, description="e.g. MCA101, CS302")
    name: str = Field(..., min_length=1, max_length=150, description="e.g. Data Structures and Algorithms")
    programmeId: str = Field(..., description="ID of the programme")
    semesterId: str = Field(..., description="ID of the semester")
    subjectType: str = Field("THEORY", description="THEORY, LAB, TUTORIAL, OTHER")
    defaultWeeklyHours: int = Field(4, ge=1, le=40, description="Hours required per week")
    defaultBlockSize: int = Field(1, ge=1, le=6, description="Consecutive periods per session (e.g. 1 for theory, 2-3 for lab)")
    requiresConsecutivePeriods: bool = Field(False, description="Whether classes must be consecutive (e.g. lab blocks)")
    description: Optional[str] = Field(None, max_length=500)
    isActive: bool = Field(True, description="Record active status")

    @field_validator("subjectCode", mode="after")
    @classmethod
    def clean_subject_code(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Subject code cannot be empty")
        return v

    @field_validator("name", mode="after")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Subject name cannot be empty")
        return v

    @field_validator("subjectType", mode="after")
    @classmethod
    def clean_subject_type(cls, v: str) -> str:
        v = v.strip().upper()
        if v not in ("THEORY", "LAB", "TUTORIAL", "OTHER"):
            # Allow extensible types but normalize to uppercase
            return v
        return v


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    subjectCode: Optional[str] = Field(None, min_length=1, max_length=30)
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    programmeId: Optional[str] = None
    semesterId: Optional[str] = None
    subjectType: Optional[str] = None
    defaultWeeklyHours: Optional[int] = Field(None, ge=1, le=40)
    defaultBlockSize: Optional[int] = Field(None, ge=1, le=6)
    requiresConsecutivePeriods: Optional[bool] = None
    description: Optional[str] = Field(None, max_length=500)
    isActive: Optional[bool] = None

    @field_validator("subjectCode", mode="after")
    @classmethod
    def clean_subject_code(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().upper()
            if not v:
                raise ValueError("Subject code cannot be empty")
        return v

    @field_validator("name", mode="after")
    @classmethod
    def clean_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Subject name cannot be empty")
        return v

    @field_validator("subjectType", mode="after")
    @classmethod
    def clean_subject_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return v.strip().upper()
        return None


class SubjectResponse(BaseEntity, SubjectBase):
    programmeName: Optional[str] = None
    semesterName: Optional[str] = None
