from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class SubstitutionPolicy(BaseModel):
    allowOvertimeSubstitutes: bool = True
    autoNotifySubstitutes: bool = True
    requireApprovalForLeave: bool = True
    prioritizeSameSubject: bool = True


class SystemSettingsBase(BaseModel):
    defaultAcademicYearId: Optional[str] = None
    defaultSemesterTypeId: Optional[str] = None
    defaultTimezone: str = "UTC"
    dateFormat: str = "YYYY-MM-DD"
    timeFormat: str = "12h"
    substitutionPolicies: SubstitutionPolicy = Field(default_factory=SubstitutionPolicy)
    notificationPreferences: Dict[str, bool] = Field(
        default_factory=lambda: {
            "timetablePublished": True,
            "leaveDecisions": True,
            "substitutionAssigned": True,
            "emergencyAbsences": True,
        }
    )


class SystemSettingsUpdate(BaseModel):
    defaultAcademicYearId: Optional[str] = None
    defaultSemesterTypeId: Optional[str] = None
    defaultTimezone: Optional[str] = None
    dateFormat: Optional[str] = None
    timeFormat: Optional[str] = None
    substitutionPolicies: Optional[SubstitutionPolicy] = None
    notificationPreferences: Optional[Dict[str, bool]] = None


class SystemSettingsResponse(SystemSettingsBase):
    id: Optional[str] = None
    updatedAt: Optional[str] = None
    updatedBy: Optional[str] = None
