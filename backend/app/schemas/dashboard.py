from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseResponse


class AttentionItem(BaseModel):
    id: str
    type: str = Field(..., description="DRAFT_NEEDS_VALIDATION, READY_FOR_APPROVAL, INVALID_TIMETABLE, etc.")
    title: str
    message: str
    severity: str = Field("warning", description="info, warning, or error")
    actionUrl: Optional[str] = None


class WorkloadBarData(BaseModel):
    facultyId: str
    facultyName: str
    facultyCode: str
    scheduledHours: int
    maxWeeklyHours: int
    utilizationPercent: float


class ResourceBarData(BaseModel):
    resourceId: str
    resourceName: str
    resourceCode: str
    resourceType: str
    usedSlots: int
    availableSlots: int
    utilizationPercent: float


class DashboardSummaryData(BaseModel):
    # Core master data counts (Maintained from Phase 2/3)
    programmes: int = Field(0, description="Active programmes count")
    classes: int = Field(0, description="Active classes count")
    faculty: int = Field(0, description="Active faculty count")
    subjects: int = Field(0, description="Active subjects count")
    resources: int = Field(0, description="Active classrooms and laboratories count")
    allocations: int = Field(0, description="Active faculty subject allocations count")

    # Phase 7 Timetable & Term Analytics
    activeAcademicYear: Optional[Dict[str, Any]] = None
    currentSemesterType: Optional[Dict[str, Any]] = None
    latestTimetable: Optional[Dict[str, Any]] = None

    publishedTimetablesCount: int = 0
    readyForApprovalCount: int = 0
    draftTimetablesCount: int = 0
    archivedTimetablesCount: int = 0
    totalTimetablesCount: int = 0
    validationIssuesCount: int = 0

    attentionItems: List[AttentionItem] = Field(default_factory=list)
    facultyWorkloadChart: List[WorkloadBarData] = Field(default_factory=list)
    resourceUtilizationChart: List[ResourceBarData] = Field(default_factory=list)


class DashboardSummaryResponse(BaseResponse):
    data: DashboardSummaryData
