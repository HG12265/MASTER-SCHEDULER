from typing import Optional
from pydantic import BaseModel, Field, model_validator
from app.schemas.common import BaseEntity


class AcademicYearBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="e.g. 2026-2027")
    startYear: int = Field(..., ge=1900, le=2200, description="e.g. 2026")
    endYear: int = Field(..., ge=1900, le=2200, description="e.g. 2027")
    isCurrent: bool = Field(False, description="Whether this is the currently active academic year")
    isActive: bool = Field(True, description="Record active status")

    @model_validator(mode="after")
    def validate_years(self):
        self.name = self.name.strip()
        if self.startYear >= self.endYear:
            raise ValueError("startYear must be strictly less than endYear")
        return self


class AcademicYearCreate(AcademicYearBase):
    pass


class AcademicYearUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    startYear: Optional[int] = Field(None, ge=1900, le=2200)
    endYear: Optional[int] = Field(None, ge=1900, le=2200)
    isCurrent: Optional[bool] = None
    isActive: Optional[bool] = None

    @model_validator(mode="after")
    def validate_update(self):
        if self.name is not None:
            self.name = self.name.strip()
        if self.startYear is not None and self.endYear is not None:
            if self.startYear >= self.endYear:
                raise ValueError("startYear must be strictly less than endYear")
        return self


class AcademicYearResponse(BaseEntity, AcademicYearBase):
    pass
