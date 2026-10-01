from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ValidationSeverity(str, Enum):
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"


class SchedulerValidationIssue(BaseModel):
    severity: ValidationSeverity
    code: str = Field(..., description="Machine-readable issue code (e.g. FACULTY_OVERLOAD)")
    message: str = Field(..., description="Actionable, descriptive diagnostic message")
    entityType: Optional[str] = Field(None, description="FACULTY, CLASS, SUBJECT, RESOURCE, TIME_SLOT, etc.")
    entityId: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class SchedulerValidationSummary(BaseModel):
    errors: int = 0
    warnings: int = 0
    info: int = 0


class SchedulerValidationResult(BaseModel):
    ready: bool = Field(..., description="True if 0 ERROR issues exist and core criteria are satisfied")
    summary: SchedulerValidationSummary
    issues: List[SchedulerValidationIssue]


class SchedulerValidateRequest(BaseModel):
    academicYearId: str = Field(..., description="ID of the academic year")
    semesterTypeId: str = Field(..., description="ID of the semester type")


class SchedulerReadinessResponse(BaseModel):
    academicYearId: str
    academicYearName: str
    semesterTypeId: str
    semesterTypeName: str
    classes: int
    faculty: int
    subjects: int
    allocations: int
    fixedSlots: int
    unavailableFacultySlots: int
    totalTeachingSlots: int
    totalRequiredPeriods: int
    validationErrors: int
    validationWarnings: int
    ready: bool
