export interface FacultyWorkloadItem {
  facultyId: string;
  facultyName: string;
  facultyCode: string;
  designation: string;
  department?: string | null;
  requiredHours: number;
  requiredAllocationHours?: number;
  scheduledHours: number;
  fixedHours: number;
  fixedTeachingHours?: number;
  maxWeeklyHours: number;
  utilizationPercent: number;
  classesCount: number;
  classCount?: number;
  subjectsCount: number;
  subjectCount?: number;
  subjectsList?: string[];
  classesList?: string[];
}

export interface FacultyWorkloadReport {
  academicYearId?: string | null;
  academicYearName?: string | null;
  semesterTypeId?: string | null;
  semesterTypeName?: string | null;
  timetableId?: string | null;
  timetableVersion?: number | null;
  timetableStatus?: string | null;
  totalFaculty: number;
  averageUtilization: number;
  items: FacultyWorkloadItem[];
}

export interface SubjectCoverageItem {
  classId: string;
  className: string;
  classDisplayName?: string | null;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  subjectType: string;
  requiredWeeklyHours: number;
  scheduledWeeklyHours: number;
  fixedSubjectHours: number;
  remainingHours: number;
  coverageStatus: "COMPLETE" | "SHORTAGE" | "OVER_SCHEDULED";
  facultyNames: string[];
}

export interface SubjectCoverageReport {
  academicYearId?: string | null;
  academicYearName?: string | null;
  semesterTypeId?: string | null;
  semesterTypeName?: string | null;
  timetableId?: string | null;
  timetableVersion?: number | null;
  timetableStatus?: string | null;
  totalSubjects: number;
  completeCount: number;
  shortageCount: number;
  overScheduledCount: number;
  items: SubjectCoverageItem[];
}

export interface ClassLoadItem {
  classId: string;
  className: string;
  programmeName?: string | null;
  semesterName?: string | null;
  requiredSubjectPeriods: number;
  scheduledSubjectPeriods: number;
  fixedActivities: number;
  totalOccupiedPeriods: number;
  totalAvailableTeachingSlots: number;
  freePeriods: number;
  dailyLoad: Record<string, number>;
}

export interface ClassLoadReport {
  academicYearId?: string | null;
  academicYearName?: string | null;
  semesterTypeId?: string | null;
  semesterTypeName?: string | null;
  timetableId?: string | null;
  timetableVersion?: number | null;
  timetableStatus?: string | null;
  totalClasses: number;
  items: ClassLoadItem[];
}

export interface ResourceUtilizationItem {
  resourceId: string;
  resourceName: string;
  resourceCode: string;
  resourceType: string;
  capacity?: number;
  availableSlots: number;
  availableTeachingSlots?: number;
  usedSlots: number;
  utilizationPercent: number;
  classesUsing?: string[];
  subjectsUsing?: string[];
  classCount?: number;
  subjectCount?: number;
}

export interface ResourceUtilizationReport {
  academicYearId?: string | null;
  academicYearName?: string | null;
  semesterTypeId?: string | null;
  semesterTypeName?: string | null;
  timetableId?: string | null;
  timetableVersion?: number | null;
  timetableStatus?: string | null;
  totalResources: number;
  averageUtilization: number;
  items: ResourceUtilizationItem[];
}

export interface ExportHistoryRecord {
  id: string;
  timetableId: string;
  exportType: "PDF" | "EXCEL";
  viewType: string;
  classId?: string | null;
  facultyId?: string | null;
  reportType?: string | null;
  filename: string;
  fileSizeBytes?: number | null;
  generatedAt: string;
  generatedBy?: string | null;
}

export type FacultyWorkloadReportResponse = FacultyWorkloadReport;
export type SubjectCoverageReportResponse = SubjectCoverageReport;
export type ClassLoadReportResponse = ClassLoadReport;
export type ResourceUtilizationReportResponse = ResourceUtilizationReport;

export interface ReportFilterParams {
  academicYearId?: string;
  semesterTypeId?: string;
  timetableId?: string;
  facultyId?: string;
  classId?: string;
  resourceType?: string;
}
