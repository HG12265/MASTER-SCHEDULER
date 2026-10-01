from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.schemas.common import BaseEntity


class FacultyBase(BaseModel):
    facultyCode: str = Field(..., min_length=1, max_length=30, description="e.g. FAC001")
    name: str = Field(..., min_length=1, max_length=120, description="Full name, e.g. Dr. Jane Doe")
    designation: Optional[str] = Field(None, max_length=100, description="e.g. Professor, Assistant Professor")
    email: Optional[EmailStr] = Field(None, description="Official university email")
    phone: Optional[str] = Field(None, max_length=30, description="Contact phone number")
    maxHoursPerWeek: int = Field(16, ge=0, description="Maximum teaching hours allocated per week")
    maxHoursPerDay: int = Field(4, ge=0, description="Maximum teaching hours in a single day")
    maxConsecutiveHours: int = Field(2, ge=0, description="Maximum consecutive periods without break")
    isActive: bool = Field(True, description="Record active status")

    @field_validator("facultyCode", mode="after")
    @classmethod
    def clean_faculty_code(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Faculty code cannot be empty")
        return v

    @field_validator("name", mode="after")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Faculty name cannot be empty")
        return v

    @field_validator("email", mode="after")
    @classmethod
    def clean_email(cls, v: Optional[EmailStr]) -> Optional[str]:
        if v is not None:
            return str(v).strip().lower()
        return None


class FacultyCreate(FacultyBase):
    pass


class FacultyUpdate(BaseModel):
    facultyCode: Optional[str] = Field(None, min_length=1, max_length=30)
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    designation: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    maxHoursPerWeek: Optional[int] = Field(None, ge=0)
    maxHoursPerDay: Optional[int] = Field(None, ge=0)
    maxConsecutiveHours: Optional[int] = Field(None, ge=0)
    isActive: Optional[bool] = None

    @field_validator("facultyCode", mode="after")
    @classmethod
    def clean_faculty_code(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().upper()
            if not v:
                raise ValueError("Faculty code cannot be empty")
        return v

    @field_validator("name", mode="after")
    @classmethod
    def clean_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Faculty name cannot be empty")
        return v

    @field_validator("email", mode="after")
    @classmethod
    def clean_email(cls, v: Optional[EmailStr]) -> Optional[str]:
        if v is not None:
            return str(v).strip().lower()
        return None


class FacultyResponse(BaseEntity, FacultyBase):
    pass
