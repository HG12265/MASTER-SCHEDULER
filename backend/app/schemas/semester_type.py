from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import BaseEntity


class SemesterTypeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="e.g. Odd Semester")
    code: str = Field(..., min_length=1, max_length=20, description="e.g. ODD or EVEN")
    description: Optional[str] = Field(None, max_length=255)
    isActive: bool = Field(True, description="Record active status")

    @field_validator("name", mode="after")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        return v

    @field_validator("code", mode="after")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Code cannot be empty")
        return v


class SemesterTypeCreate(SemesterTypeBase):
    pass


class SemesterTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=20)
    description: Optional[str] = Field(None, max_length=255)
    isActive: Optional[bool] = None

    @field_validator("name", mode="after")
    @classmethod
    def clean_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Name cannot be empty")
        return v

    @field_validator("code", mode="after")
    @classmethod
    def normalize_code(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().upper()
            if not v:
                raise ValueError("Code cannot be empty")
        return v


class SemesterTypeResponse(BaseEntity, SemesterTypeBase):
    pass
