from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import BaseEntity


class ClassBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="e.g. MCA-Sem1-SecA")
    displayName: str = Field(..., min_length=1, max_length=150, description="e.g. MCA Semester I - Section A")
    programmeId: str = Field(..., description="ID of the programme")
    semesterId: str = Field(..., description="ID of the semester")
    academicYearId: str = Field(..., description="ID of the academic year")
    semesterTypeId: str = Field(..., description="ID of the semester type (ODD/EVEN)")
    section: Optional[str] = Field(None, max_length=10, description="e.g. A, B or None")
    studentStrength: int = Field(0, ge=0, description="Number of students in the class")
    isActive: bool = Field(True, description="Record active status")

    @field_validator("name", "displayName", mode="after")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Class name cannot be empty")
        return v

    @field_validator("section", mode="after")
    @classmethod
    def clean_section(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().upper()
            return v if v else None
        return None


class ClassCreate(ClassBase):
    pass


class ClassUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    displayName: Optional[str] = Field(None, min_length=1, max_length=150)
    programmeId: Optional[str] = None
    semesterId: Optional[str] = None
    academicYearId: Optional[str] = None
    semesterTypeId: Optional[str] = None
    section: Optional[str] = None
    studentStrength: Optional[int] = Field(None, ge=0)
    isActive: Optional[bool] = None

    @field_validator("name", "displayName", mode="after")
    @classmethod
    def clean_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Class name cannot be empty")
        return v

    @field_validator("section", mode="after")
    @classmethod
    def clean_section(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().upper()
            return v if v else None
        return None


class ClassResponse(BaseEntity, ClassBase):
    programmeName: Optional[str] = None
    semesterName: Optional[str] = None
    academicYearName: Optional[str] = None
    semesterTypeName: Optional[str] = None
