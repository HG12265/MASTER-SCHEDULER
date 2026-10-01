from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import BaseEntity


class ResourceBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=30, description="e.g. CR-101, LAB-CS-01")
    name: str = Field(..., min_length=1, max_length=120, description="e.g. Computer Science Laboratory 1")
    resourceType: str = Field("CLASSROOM", description="CLASSROOM, LAB, SEMINAR_HALL, etc.")
    capacity: int = Field(60, ge=0, description="Seating or student workstation capacity")
    location: Optional[str] = Field(None, max_length=100, description="e.g. Block A, 2nd Floor")
    description: Optional[str] = Field(None, max_length=300)
    isActive: bool = Field(True, description="Record active status")

    @field_validator("code", mode="after")
    @classmethod
    def clean_code(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Resource code cannot be empty")
        return v

    @field_validator("name", mode="after")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Resource name cannot be empty")
        return v

    @field_validator("resourceType", mode="after")
    @classmethod
    def clean_type(cls, v: str) -> str:
        return v.strip().upper()


class ResourceCreate(ResourceBase):
    pass


class ResourceUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=30)
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    resourceType: Optional[str] = None
    capacity: Optional[int] = Field(None, ge=0)
    location: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=300)
    isActive: Optional[bool] = None

    @field_validator("code", mode="after")
    @classmethod
    def clean_code(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().upper()
            if not v:
                raise ValueError("Resource code cannot be empty")
        return v

    @field_validator("name", mode="after")
    @classmethod
    def clean_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Resource name cannot be empty")
        return v

    @field_validator("resourceType", mode="after")
    @classmethod
    def clean_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return v.strip().upper()
        return None


class ResourceResponse(BaseEntity, ResourceBase):
    pass
