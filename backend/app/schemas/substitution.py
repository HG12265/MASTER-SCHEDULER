from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field


class SubstitutionStatus(str, Enum):
    PROPOSED = "PROPOSED"
    ASSIGNED = "ASSIGNED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class AssignmentType(str, Enum):
    SUBSTITUTION = "SUBSTITUTION"
    CANCELLED = "CANCELLED"
    ACTIVITY = "ACTIVITY"
    RESCHEDULED = "RESCHEDULED"


class CandidateReason(BaseModel):
    category: str  # e.g. "Availability", "Subject Allocation", "Workload"
    detail: str    # e.g. "Free during Period 2", "Allocated to Operating Systems"
    isPositive: bool = True


class SubstituteCandidate(BaseModel):
    facultyId: str
    facultyName: str
    facultyCode: str
    department: Optional[str] = None
    designation: Optional[str] = None
    matchScore: int
    isAllocatedToSubject: bool
    isAllocatedToClass: bool
    isAllocatedToProgramme: bool
    scheduledPeriodsToday: int
    weeklyScheduledHours: int
    reasons: List[str]
    reasonsStructured: List[CandidateReason] = Field(default_factory=list)


class SubstitutionCandidateResponse(BaseModel):
    date: str
    originalEntryId: str
    absentFacultyId: str
    absentFacultyName: str
    classId: str
    className: str
    subjectId: str
    subjectName: str
    timeSlotId: str
    timeSlotName: str
    startTime: str
    endTime: str
    candidates: List[SubstituteCandidate]


class SubstitutionCreate(BaseModel):
    date: str = Field(..., description="Target date YYYY-MM-DD")
    originalEntryId: str
    substituteFacultyId: Optional[str] = None
    assignmentType: AssignmentType = AssignmentType.SUBSTITUTION
    notes: Optional[str] = None


class SubstitutionResponse(BaseModel):
    id: str
    date: str
    publishedTimetableId: str
    originalEntryId: str
    absentFacultyId: str
    absentFacultyName: Optional[str] = None
    substituteFacultyId: Optional[str] = None
    substituteFacultyName: Optional[str] = None
    classId: str
    className: Optional[str] = None
    subjectId: str
    subjectName: Optional[str] = None
    subjectCode: Optional[str] = None
    workingDayId: str
    workingDayName: Optional[str] = None
    timeSlotId: str
    timeSlotName: Optional[str] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    resourceId: Optional[str] = None
    resourceName: Optional[str] = None
    status: str
    assignmentType: str
    notes: Optional[str] = None
    createdBy: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class EmergencyAbsenceCreate(BaseModel):
    facultyId: str
    date: str = Field(..., description="Date formatted as YYYY-MM-DD")
    fullDay: bool = True
    affectedTimeSlotIds: Optional[List[str]] = Field(default_factory=list)
    reason: str = Field(..., min_length=2, max_length=500)


class DailyScheduleSession(BaseModel):
    entryId: str
    timetableId: str
    classId: str
    className: str
    subjectId: str
    subjectName: str
    subjectCode: str
    timeSlotId: str
    timeSlotName: str
    startTime: str
    endTime: str
    slotOrder: int
    resourceId: Optional[str] = None
    resourceName: Optional[str] = None
    scheduledFacultyIds: List[str]
    scheduledFacultyNames: List[str]
    effectiveFacultyId: Optional[str] = None
    effectiveFacultyName: Optional[str] = None
    isMultiFaculty: bool = False
    sessionStatus: str  # NORMAL, SUBSTITUTED, CANCELLED, ACTIVITY, UNRESOLVED
    substitutionId: Optional[str] = None
    assignmentType: Optional[str] = None
    notes: Optional[str] = None


class DailyScheduleSummary(BaseModel):
    date: str
    dayOfWeek: str
    isTeachingDay: bool
    isException: bool
    exceptionTitle: Optional[str] = None
    effectiveWorkingDayId: Optional[str] = None
    effectiveWorkingDayName: Optional[str] = None
    scheduledClassesCount: int
    facultyOnLeaveCount: int
    substitutionsCount: int
    cancelledPeriodsCount: int
    unresolvedPeriodsCount: int
    facultyOnLeave: List[Dict[str, Any]] = Field(default_factory=list)
    sessions: List[DailyScheduleSession] = Field(default_factory=list)
