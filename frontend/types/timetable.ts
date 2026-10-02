export type TimetableStatus = "DRAFT" | "READY_FOR_APPROVAL" | "PUBLISHED" | "ARCHIVED";

export type SolverStatus = "OPTIMAL" | "FEASIBLE" | "INFEASIBLE" | "UNKNOWN";

export type TimetableEntryType =
  | "SUBJECT"
  | "LIBRARY"
  | "SUPPORTIVE"
  | "NET_SET"
  | "ACTIVITY"
  | "MEETING"
  | "OTHER";

export interface TimetableSolverOptions {
  maxSolveSeconds?: number;
  numWorkers?: number;
  randomSeed?: number;
}

export interface TimetableGenerateRequest {
  academicYearId: string;
  semesterTypeId: string;
  classIds?: string[];
  replaceExistingDraft?: boolean;
  solverOptions?: TimetableSolverOptions;
}

export interface FacultyWorkloadStat {
  facultyId: string;
  facultyName: string;
  facultyCode: string;
  requiredHours: number;
  scheduledHours: number;
  maxWeeklyHours: number;
  utilizationPercent: number;
}

export interface ClassCoverageStat {
  classId: string;
  className: string;
  requiredSubjectPeriods: number;
  scheduledSubjectPeriods: number;
  fixedActivities: number;
  coveragePercent: number;
}

export interface TimetableSummaryStats {
  totalClasses: number;
  totalScheduledSubjectPeriods: number;
  totalFixedPeriods: number;
  totalAllocatedPeriods: number;
  facultyWorkloadUtilization: FacultyWorkloadStat[];
  classCoverage: ClassCoverageStat[];
  objectiveBreakdown?: Record<string, any>;
}

export interface Timetable {
  id: string;
  academicYearId: string;
  academicYearName?: string;
  semesterTypeId: string;
  semesterTypeName?: string;
  name: string;
  version: number;
  status: TimetableStatus;
  solverStatus: SolverStatus;
  objectiveValue?: number;
  revision?: number;
  validationStatus?: string;
  validationIssues?: any[];
  generatedAt: string;
  generationDurationMs: number;
  solverOptions?: Record<string, any>;
  stats?: TimetableSummaryStats;
  classIds?: string[];
  publishedAt?: string | null;
  publishedBy?: string | null;
  publicationRevision?: number | null;
  publicationVersion?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimetableEntry {
  id: string;
  timetableId: string;
  academicYearId: string;
  semesterTypeId: string;
  classId: string;
  className?: string;
  classDisplayName?: string;
  workingDayId: string;
  dayName?: string;
  dayOrder?: number;
  timeSlotId: string;
  timeSlotName?: string;
  startTime?: string;
  endTime?: string;
  slotOrder?: number;
  allocationId?: string;
  subjectId?: string;
  subjectName?: string;
  subjectCode?: string;
  facultyIds: string[];
  facultyNames: string[];
  resourceId?: string;
  resourceName?: string;
  resourceCode?: string;
  entryType: TimetableEntryType;
  title?: string;
  blockId?: string;
  blockSize?: number;
  blockIndex?: number;
  isFixed: boolean;
  isLocked?: boolean;
  isManuallyLocked?: boolean;
  isGenerated: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimetableMasterView {
  timetable: Timetable;
  classes: {
    id: string;
    name: string;
    section?: string;
    displayName?: string;
    capacity?: number;
    programmeCode?: string;
    semesterNumber?: number;
  }[];
  workingDays: {
    id: string;
    name: string;
    shortName: string;
    dayOrder: number;
    isWorkingDay: boolean;
  }[];
  teachingSlots: {
    id: string;
    name: string;
    slotOrder: number;
    startTime: string;
    endTime: string;
    isBreak: boolean;
    isLunch: boolean;
  }[];
  entries: TimetableEntry[];
}

export interface GenerateResultPayload {
  success: boolean;
  message: string;
  timetable?: Timetable;
  solverStatus?: SolverStatus;
  diagnostics?: string[];
  solveTimeMs?: number;
}
