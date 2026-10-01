from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import BaseEntity


class WorkingDayBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="e.g. Monday")
    shortName: str = Field(..., min_length=1, max_length=10, description="e.g. MON")
    dayOrder: int = Field(..., ge=1, le=14, description="Sequential order of day, e.g. 1 for Mon")
    isWorkingDay: bool = Field(True, description="Whether classes are scheduled on this day")
    isActive: bool = Field(True, description="Record active status")

    @field_validator("name", mode="after")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        return v

    @field_validator("shortName", mode="after")
    @classmethod
    def clean_short_name(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Short name cannot be empty")
        return v


class WorkingDayCreate(WorkingDayBase):
    pass


class WorkingDayUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    shortName: Optional[str] = Field(None, min_length=1, max_length=10)
    dayOrder: Optional[int] = Field(None, ge=1, le=14)
    isWorkingDay: Optional[bool] = None
    isActive: Optional[bool] = None

    @field_validator("name", mode="after")
    @classmethod
    def clean_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Name cannot be empty")
        return v

    @field_validator("shortName", mode="after")
    @classmethod
    def clean_short_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().upper()
            if not v:
                raise ValueError("Short name cannot be empty")
        return v


class WorkingDayResponse(BaseEntity, WorkingDayBase):
    pass
