from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class FacultyWorkloadItem(BaseModel):
    facultyId: str
    facultyName: str
    facultyCode: str
    designation: str
    department: Optional[str] = None
    requiredHours: int = 0
    scheduledHours: int = 0
    fixedHours: int = 0
    maxWeeklyHours: int = 16
    utilizationPercent: float = 0.0
    classesCount: int = 0
    subjectsCount: int = 0
    subjectsList: List[str] = Field(default_factory=list)
    classesList: List[str] = Field(default_factory=list)


class FacultyWorkloadReport(BaseModel):
    academicYearId: Optional[str] = None
    semesterTypeId: Optional[str] = None
    timetableId: Optional[str] = None
    timetableVersion: Optional[int] = None
    timetableStatus: Optional[str] = None
    totalFaculty: int = 0
    averageUtilization: float = 0.0
    items: List[FacultyWorkloadItem] = Field(default_factory=list)


class SubjectCoverageItem(BaseModel):
    classId: str
    className: str
    classDisplayName: Optional[str] = None
    subjectId: str
    subjectCode: str
    subjectName: str
    subjectType: str
    requiredWeeklyHours: int
    scheduledWeeklyHours: int
    fixedSubjectHours: int = 0
    remainingHours: int = 0
    coverageStatus: str = Field(..., description="COMPLETE, SHORTAGE, OVER_SCHEDULED")
    facultyNames: List[str] = Field(default_factory=list)


class SubjectCoverageReport(BaseModel):
    academicYearId: Optional[str] = None
    semesterTypeId: Optional[str] = None
    timetableId: Optional[str] = None
    totalSubjects: int = 0
    completeCount: int = 0
    shortageCount: int = 0
    overScheduledCount: int = 0
    items: List[SubjectCoverageItem] = Field(default_factory=list)


class ClassLoadItem(BaseModel):
    classId: str
    className: str
    programmeName: Optional[str] = None
    semesterName: Optional[str] = None
    requiredSubjectPeriods: int = 0
    scheduledSubjectPeriods: int = 0
    fixedActivities: int = 0
    totalOccupiedPeriods: int = 0
    totalAvailableTeachingSlots: int = 0
    freePeriods: int = 0
    dailyLoad: Dict[str, int] = Field(default_factory=dict)


class ClassLoadReport(BaseModel):
    academicYearId: Optional[str] = None
    semesterTypeId: Optional[str] = None
    timetableId: Optional[str] = None
    totalClasses: int = 0
    items: List[ClassLoadItem] = Field(default_factory=list)


class ResourceUtilizationItem(BaseModel):
    resourceId: str
    resourceName: str
    resourceCode: str
    resourceType: str
    capacity: int = 0
    availableSlots: int = 0
    usedSlots: int = 0
    utilizationPercent: float = 0.0
    classesUsing: List[str] = Field(default_factory=list)
    subjectsUsing: List[str] = Field(default_factory=list)


class ResourceUtilizationReport(BaseModel):
    academicYearId: Optional[str] = None
    semesterTypeId: Optional[str] = None
    timetableId: Optional[str] = None
    totalResources: int = 0
    averageUtilization: float = 0.0
    items: List[ResourceUtilizationItem] = Field(default_factory=list)
