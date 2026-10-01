from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import BaseEntity


class ProgrammeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, description="e.g. Master of Computer Applications")
    code: str = Field(..., min_length=1, max_length=30, description="e.g. MCA, MSC-CS")
    shortName: str = Field(..., min_length=1, max_length=30, description="e.g. MCA")
    totalSemesters: int = Field(..., ge=1, le=16, description="Total semesters (e.g. 4 for MCA, 8 for B.Tech)")
    description: Optional[str] = Field(None, max_length=500)
    isActive: bool = Field(True, description="Record active status")

    @field_validator("name", mode="after")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Programme name cannot be empty")
        return v

    @field_validator("code", mode="after")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Programme code cannot be empty")
        return v

    @field_validator("shortName", mode="after")
    @classmethod
    def normalize_short_name(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Programme shortName cannot be empty")
        return v


class ProgrammeCreate(ProgrammeBase):
    pass


class ProgrammeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    code: Optional[str] = Field(None, min_length=1, max_length=30)
    shortName: Optional[str] = Field(None, min_length=1, max_length=30)
    totalSemesters: Optional[int] = Field(None, ge=1, le=16)
    description: Optional[str] = Field(None, max_length=500)
    isActive: Optional[bool] = None

    @field_validator("name", mode="after")
    @classmethod
    def clean_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Programme name cannot be empty")
        return v

    @field_validator("code", mode="after")
    @classmethod
    def normalize_code(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().upper()
            if not v:
                raise ValueError("Programme code cannot be empty")
        return v

    @field_validator("shortName", mode="after")
    @classmethod
    def normalize_short_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().upper()
            if not v:
                raise ValueError("Programme shortName cannot be empty")
        return v


class ProgrammeResponse(BaseEntity, ProgrammeBase):
    pass
