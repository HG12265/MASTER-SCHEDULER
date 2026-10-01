from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import BaseEntity


class SemesterBase(BaseModel):
    programmeId: str = Field(..., description="ID of the parent programme")
    semesterNumber: int = Field(..., ge=1, le=16, description="1, 2, 3, etc.")
    name: str = Field(..., min_length=1, max_length=50, description="e.g. Semester I")
    displayName: str = Field(..., min_length=1, max_length=100, description="e.g. MCA Semester I")
    isActive: bool = Field(True, description="Record active status")

    @field_validator("name", "displayName", mode="after")
    @classmethod
    def clean_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be empty")
        return v


class SemesterCreate(SemesterBase):
    pass


class SemesterUpdate(BaseModel):
    semesterNumber: Optional[int] = Field(None, ge=1, le=16)
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    displayName: Optional[str] = Field(None, min_length=1, max_length=100)
    isActive: Optional[bool] = None

    @field_validator("name", "displayName", mode="after")
    @classmethod
    def clean_text(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Field cannot be empty")
        return v


class SemesterResponse(BaseEntity, SemesterBase):
    programmeCode: Optional[str] = Field(None, description="Enriched programme code for display")
