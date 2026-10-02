from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseEntity


class TimetableStatus(str, Enum):
    DRAFT = "DRAFT"
    READY_FOR_APPROVAL = "READY_FOR_APPROVAL"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class SolverStatus(str, Enum):
    OPTIMAL = "OPTIMAL"
    FEASIBLE = "FEASIBLE"
    INFEASIBLE = "INFEASIBLE"
    UNKNOWN = "UNKNOWN"


class TimetableEntryType(str, Enum):
    SUBJECT = "SUBJECT"
    LIBRARY = "LIBRARY"
    SUPPORTIVE = "SUPPORTIVE"
    NET_SET = "NET_SET"
    ACTIVITY = "ACTIVITY"
    MEETING = "MEETING"
    OTHER = "OTHER"


class TimetableSolverOptions(BaseModel):
    maxSolveSeconds: int = Field(30, ge=1, le=300, description="Max solve time in seconds")
    numWorkers: int = Field(4, ge=1, le=16, description="Parallel CP-SAT search workers")
    randomSeed: Optional[int] = Field(42, description="Random seed for solver determinism")


class TimetableGenerateRequest(BaseModel):
    academicYearId: str = Field(..., description="Academic Year ID")
    semesterTypeId: str = Field(..., description="Semester Type ID")
    classIds: Optional[List[str]] = Field(None, description="Optional class IDs filter; if omitted, all active classes in term are scheduled")
    replaceExistingDraft: bool = Field(False, description="Whether to archive previous draft version instead of incrementing version")
    solverOptions: Optional[TimetableSolverOptions] = Field(default_factory=TimetableSolverOptions)


class TimetableEntryResponse(BaseModel):
    id: str
    timetableId: str
    academicYearId: str
    semesterTypeId: str
    classId: str
    className: Optional[str] = None
    classDisplayName: Optional[str] = None
    workingDayId: str
    dayName: Optional[str] = None
    dayOrder: Optional[int] = None
    timeSlotId: str
    timeSlotName: Optional[str] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    slotOrder: Optional[int] = None
    allocationId: Optional[str] = None
    subjectId: Optional[str] = None
    subjectName: Optional[str] = None
    subjectCode: Optional[str] = None
    facultyIds: List[str] = Field(default_factory=list)
    facultyNames: List[str] = Field(default_factory=list)
    resourceId: Optional[str] = None
    resourceName: Optional[str] = None
    resourceCode: Optional[str] = None
    entryType: TimetableEntryType = TimetableEntryType.SUBJECT
    title: Optional[str] = None
    blockId: Optional[str] = None
    blockSize: int = 1
    blockIndex: int = 0
    isFixed: bool = False
    isLocked: bool = False
    isManuallyLocked: bool = False
    lockedAt: Optional[datetime] = None
    lockedBy: Optional[str] = None
    isGenerated: bool = True
    isActive: bool = True
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


class FacultyWorkloadStat(BaseModel):
    facultyId: str
    facultyName: str
    facultyCode: str
    requiredHours: int
    scheduledHours: int
    maxWeeklyHours: int
    utilizationPercent: float


class ClassCoverageStat(BaseModel):
    classId: str
    className: str
    requiredSubjectPeriods: int
    scheduledSubjectPeriods: int
    fixedActivities: int
    coveragePercent: float


class TimetableSummaryStats(BaseModel):
    totalClasses: int = 0
    totalScheduledSubjectPeriods: int = 0
    totalFixedPeriods: int = 0
    totalAllocatedPeriods: int = 0
    facultyWorkloadUtilization: List[FacultyWorkloadStat] = Field(default_factory=list)
    classCoverage: List[ClassCoverageStat] = Field(default_factory=list)
    objectiveBreakdown: Optional[Dict[str, Any]] = None


class TimetableResponse(BaseEntity):
    academicYearId: str
    academicYearName: Optional[str] = None
    semesterTypeId: str
    semesterTypeName: Optional[str] = None
    name: str
    version: int
    revision: int = 1
    status: TimetableStatus = TimetableStatus.DRAFT
    solverStatus: SolverStatus = SolverStatus.FEASIBLE
    validationStatus: str = "VALID"
    validationIssues: List[Dict[str, Any]] = Field(default_factory=list)
    objectiveValue: Optional[float] = None
    generatedAt: datetime
    generationDurationMs: int = 0
    solverOptions: Dict[str, Any] = Field(default_factory=dict)
    stats: TimetableSummaryStats = Field(default_factory=TimetableSummaryStats)
    classIds: List[str] = Field(default_factory=list)
    publishedAt: Optional[datetime] = None
    publishedBy: Optional[str] = None
    publicationRevision: Optional[int] = None
    publicationVersion: Optional[int] = None


class TimetableMasterViewResponse(BaseModel):
    timetable: TimetableResponse
    classes: List[Dict[str, Any]]
    workingDays: List[Dict[str, Any]]
    teachingSlots: List[Dict[str, Any]]
    entries: List[TimetableEntryResponse]


# ============================================================
# PHASE 6: EDITING & PARTIAL REGENERATION SCHEMAS
# ============================================================

class ConflictType(str, Enum):
    CLASS_CONFLICT = "CLASS_CONFLICT"
    FACULTY_CONFLICT = "FACULTY_CONFLICT"
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT"
    FACULTY_UNAVAILABLE = "FACULTY_UNAVAILABLE"
    CLASS_BLOCKED_SLOT = "CLASS_BLOCKED_SLOT"
    FACULTY_DAILY_LIMIT = "FACULTY_DAILY_LIMIT"
    FACULTY_CONSECUTIVE_LIMIT = "FACULTY_CONSECUTIVE_LIMIT"
    FACULTY_WEEKLY_LIMIT = "FACULTY_WEEKLY_LIMIT"
    CLASS_DAILY_LIMIT = "CLASS_DAILY_LIMIT"
    CLASS_CONSECUTIVE_LIMIT = "CLASS_CONSECUTIVE_LIMIT"
    SUBJECT_DAILY_LIMIT = "SUBJECT_DAILY_LIMIT"
    SUBJECT_WEEKLY_OVERFLOW = "SUBJECT_WEEKLY_OVERFLOW"
    SUBJECT_WEEKLY_SHORTAGE = "SUBJECT_WEEKLY_SHORTAGE"
    FIXED_SLOT_CONFLICT = "FIXED_SLOT_CONFLICT"
    LOCKED_ENTRY = "LOCKED_ENTRY"
    LAB_BLOCK_INVALID = "LAB_BLOCK_INVALID"
    NON_TEACHING_SLOT = "NON_TEACHING_SLOT"
    STALE_REVISION = "STALE_REVISION"


class TimetableEditConflict(BaseModel):
    type: ConflictType
    message: str
    details: Optional[Dict[str, Any]] = None


class MovePreviewRequest(BaseModel):
    entryId: str = Field(..., description="ID of entry to move")
    targetWorkingDayId: str = Field(..., description="Target working day ID")
    targetTimeSlotId: str = Field(..., description="Target starting time slot ID")


class MovePreviewResponse(BaseModel):
    valid: bool
    conflicts: List[TimetableEditConflict] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    affectedEntries: List[Dict[str, Any]] = Field(default_factory=list)
    message: str = ""
    blockSize: int = 1
    occupyingEntry: Optional[Dict[str, Any]] = None


class ApplyMoveRequest(BaseModel):
    targetWorkingDayId: str = Field(..., description="Target working day ID")
    targetTimeSlotId: str = Field(..., description="Target starting time slot ID")
    expectedRevision: int = Field(..., description="Expected timetable revision for optimistic concurrency")


class SwapPreviewRequest(BaseModel):
    firstEntryId: str = Field(..., description="First entry ID")
    secondEntryId: str = Field(..., description="Second entry ID")


class SwapPreviewResponse(BaseModel):
    valid: bool
    conflicts: List[TimetableEditConflict] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    message: str = ""


class ApplySwapRequest(BaseModel):
    firstEntryId: str = Field(..., description="First entry ID")
    secondEntryId: str = Field(..., description="Second entry ID")
    expectedRevision: int = Field(..., description="Expected timetable revision")


class ManualEntryCreateRequest(BaseModel):
    classId: str = Field(..., description="Class ID")
    workingDayId: str = Field(..., description="Working Day ID")
    timeSlotId: str = Field(..., description="Time Slot ID")
    entryType: TimetableEntryType = TimetableEntryType.SUBJECT
    subjectId: Optional[str] = None
    facultyIds: List[str] = Field(default_factory=list)
    resourceId: Optional[str] = None
    title: Optional[str] = None
    lockAfterAdding: bool = False
    expectedRevision: int = Field(..., description="Expected timetable revision")


class RegenerationScope(BaseModel):
    classIds: List[str] = Field(default_factory=list)
    facultyIds: List[str] = Field(default_factory=list)
    workingDayIds: List[str] = Field(default_factory=list)
    timeSlotIds: List[str] = Field(default_factory=list)
    entryIds: List[str] = Field(default_factory=list)


class RegenerationPreviewRequest(BaseModel):
    scope: RegenerationScope = Field(default_factory=RegenerationScope)
    preserveLockedEntries: bool = True
    solverOptions: Optional[TimetableSolverOptions] = Field(default_factory=TimetableSolverOptions)


class MovedEntryDiff(BaseModel):
    entryId: str
    subjectName: Optional[str] = None
    subjectCode: Optional[str] = None
    className: Optional[str] = None
    fromDayName: Optional[str] = None
    fromTimeSlotName: Optional[str] = None
    toDayName: Optional[str] = None
    toTimeSlotName: Optional[str] = None


class RegenerationPreviewResponse(BaseModel):
    previewToken: str
    solverStatus: str
    success: bool
    message: str = ""
    changedEntries: int = 0
    addedEntries: int = 0
    removedEntries: int = 0
    movedEntries: List[MovedEntryDiff] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    expectedRevision: int


class ApplyRegenerationRequest(BaseModel):
    previewToken: str = Field(..., description="Token returned from regeneration preview")
    expectedRevision: int = Field(..., description="Expected timetable revision")


class TimetableChangeHistoryResponse(BaseModel):
    id: str
    timetableId: str
    revision: int
    changeType: str
    description: str
    affectedEntryIds: List[str] = Field(default_factory=list)
    performedAt: datetime
    performedBy: Optional[str] = None
    reverted: bool = False
    revertedAt: Optional[datetime] = None


class TimetableValidationSummary(BaseModel):
    errors: int = 0
    warnings: int = 0


class TimetableValidationIssue(BaseModel):
    code: str
    severity: str
    message: str
    entityType: Optional[str] = None
    entityId: Optional[str] = None


class TimetableValidationReport(BaseModel):
    status: str
    summary: TimetableValidationSummary
    issues: List[TimetableValidationIssue] = Field(default_factory=list)


class UndoRequest(BaseModel):
    expectedRevision: int = Field(..., description="Expected timetable revision")

