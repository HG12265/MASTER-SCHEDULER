import { BaseEntity } from "./api";

// ----------------------------------------------------
// 1. Faculty Availability
// ----------------------------------------------------
export type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "PREFERRED" | "AVOID";

export interface FacultyAvailability extends BaseEntity {
  academicYearId: string;
  semesterTypeId: string;
  facultyId: string;
  workingDayId: string;
  timeSlotId: string;
  availabilityStatus: AvailabilityStatus;
  reason?: string;
  notes?: string;

  // Enriched fields from backend
  facultyName?: string;
  facultyCode?: string;
  dayName?: string;
  timeSlotName?: string;
  startTime?: string;
  endTime?: string;
}

export interface FacultyAvailabilityBulkEntry {
  workingDayId: string;
  timeSlotId: string;
  availabilityStatus: AvailabilityStatus;
  reason?: string;
}

export interface FacultyAvailabilityBulkUpdate {
  academicYearId: string;
  semesterTypeId: string;
  facultyId: string;
  entries: FacultyAvailabilityBulkEntry[];
}

export interface FacultyAvailabilityFormData {
  academicYearId: string;
  semesterTypeId: string;
  facultyId: string;
  workingDayId: string;
  timeSlotId: string;
  availabilityStatus: AvailabilityStatus;
  reason?: string;
  notes?: string;
}

// ----------------------------------------------------
// 2. Fixed Timetable Slots
// ----------------------------------------------------
export type FixedSlotCategory =
  | "SUBJECT"
  | "LIBRARY"
  | "SUPPORTIVE"
  | "NET_SET"
  | "ACTIVITY"
  | "MEETING"
  | "OTHER";

export interface FixedSlot extends BaseEntity {
  academicYearId: string;
  semesterTypeId: string;
  classId: string;
  workingDayId: string;
  timeSlotId: string;
  slotCategory: FixedSlotCategory;
  subjectId?: string;
  facultyIds: string[];
  resourceId?: string;
  title?: string;
  description?: string;
  isLocked: boolean;

  // Enriched fields from backend
  className?: string;
  classDisplayName?: string;
  dayName?: string;
  dayOrder?: number;
  timeSlotName?: string;
  startTime?: string;
  endTime?: string;
  slotOrder?: number;
  subjectName?: string;
  subjectCode?: string;
  facultyNames?: string[];
  resourceName?: string;
  resourceCode?: string;
}

export interface FixedSlotFormData {
  academicYearId: string;
  semesterTypeId: string;
  classId: string;
  workingDayId: string;
  timeSlotId: string;
  slotCategory: FixedSlotCategory;
  subjectId?: string;
  facultyIds: string[];
  resourceId?: string;
  title?: string;
  description?: string;
  isLocked: boolean;
}

// ----------------------------------------------------
// 3. Scheduling Settings
// ----------------------------------------------------
export interface SoftConstraintWeights {
  subjectDistribution: number;
  facultyLoadBalance: number;
  avoidConsecutiveHours: number;
  preferredAvailability: number;
  avoidAvailability: number;
  avoidLastPeriod: number;
  avoidFirstPeriod: number;
  labBlockContinuity: number;
}

export interface SchedulingSettings extends BaseEntity {
  academicYearId?: string;
  semesterTypeId?: string;
  maxFacultyHoursPerDay: number;
  maxFacultyConsecutiveHours: number;
  maxClassConsecutiveHours: number;
  avoidSameSubjectMultipleTimesPerDay: boolean;
  distributeSubjectsAcrossWeek: boolean;
  balanceFacultyDailyLoad: boolean;
  preferLabsInBlocks: boolean;
  avoidFirstPeriodForFaculty: boolean;
  avoidLastPeriodForFaculty: boolean;
  allowFreePeriodsForClasses: boolean;
  allowUnassignedSlots: boolean;
  softConstraintWeights: SoftConstraintWeights;
}

export interface SchedulingSettingsFormData {
  academicYearId?: string;
  semesterTypeId?: string;
  maxFacultyHoursPerDay: number;
  maxFacultyConsecutiveHours: number;
  maxClassConsecutiveHours: number;
  avoidSameSubjectMultipleTimesPerDay: boolean;
  distributeSubjectsAcrossWeek: boolean;
  balanceFacultyDailyLoad: boolean;
  preferLabsInBlocks: boolean;
  avoidFirstPeriodForFaculty: boolean;
  avoidLastPeriodForFaculty: boolean;
  allowFreePeriodsForClasses: boolean;
  allowUnassignedSlots: boolean;
  softConstraintWeights: SoftConstraintWeights;
}

// ----------------------------------------------------
// 4. Class Constraints
// ----------------------------------------------------
export interface ClassConstraint extends BaseEntity {
  academicYearId: string;
  semesterTypeId: string;
  classId: string;
  maxPeriodsPerDay?: number;
  maxConsecutivePeriods?: number;
  allowFreePeriods: boolean;
  preferredFreeSlotIds: string[];
  blockedSlotIds: string[];
  notes?: string;

  // Enriched
  className?: string;
  classDisplayName?: string;
}

export interface ClassConstraintFormData {
  academicYearId: string;
  semesterTypeId: string;
  classId: string;
  maxPeriodsPerDay?: number;
  maxConsecutivePeriods?: number;
  allowFreePeriods: boolean;
  preferredFreeSlotIds: string[];
  blockedSlotIds: string[];
  notes?: string;
}

// ----------------------------------------------------
// 5. Faculty Constraints
// ----------------------------------------------------
export interface FacultyConstraint extends BaseEntity {
  academicYearId: string;
  semesterTypeId: string;
  facultyId: string;
  preferredMaxHoursPerDay?: number;
  preferredMinHoursPerDay?: number;
  avoidFirstPeriod: boolean;
  avoidLastPeriod: boolean;
  preferCompactSchedule: boolean;
  minimumGapBetweenSessions: number;
  notes?: string;

  // Enriched
  facultyName?: string;
  facultyCode?: string;
  baseMaxHoursPerWeek?: number;
  baseMaxHoursPerDay?: number;
  baseMaxConsecutiveHours?: number;
}

export interface FacultyConstraintFormData {
  academicYearId: string;
  semesterTypeId: string;
  facultyId: string;
  preferredMaxHoursPerDay?: number;
  preferredMinHoursPerDay?: number;
  avoidFirstPeriod: boolean;
  avoidLastPeriod: boolean;
  preferCompactSchedule: boolean;
  minimumGapBetweenSessions: number;
  notes?: string;
}

// ----------------------------------------------------
// 6. Subject Preferences
// ----------------------------------------------------
export interface SubjectConstraint extends BaseEntity {
  academicYearId: string;
  semesterTypeId: string;
  classId: string;
  subjectId: string;
  maxSessionsPerDay: number;
  minDaysBetweenSessions: number;
  preferredTimeSlotIds: string[];
  avoidTimeSlotIds: string[];
  preferredWorkingDayIds: string[];
  avoidWorkingDayIds: string[];
  notes?: string;

  // Enriched
  className?: string;
  subjectName?: string;
  subjectCode?: string;
}

export interface SubjectConstraintFormData {
  academicYearId: string;
  semesterTypeId: string;
  classId: string;
  subjectId: string;
  maxSessionsPerDay: number;
  minDaysBetweenSessions: number;
  preferredTimeSlotIds: string[];
  avoidTimeSlotIds: string[];
  preferredWorkingDayIds: string[];
  avoidWorkingDayIds: string[];
  notes?: string;
}

// ----------------------------------------------------
// 7. Scheduler Validation & Readiness
// ----------------------------------------------------
export type ValidationSeverity = "ERROR" | "WARNING" | "INFO";

export interface SchedulerValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

export interface SchedulerValidationSummary {
  errors: number;
  warnings: number;
  info: number;
}

export interface SchedulerValidationResult {
  ready: boolean;
  summary: SchedulerValidationSummary;
  issues: SchedulerValidationIssue[];
}

export interface SchedulerReadiness {
  academicYearId: string;
  academicYearName: string;
  semesterTypeId: string;
  semesterTypeName: string;
  classes: number;
  faculty: number;
  subjects: number;
  allocations: number;
  fixedSlots: number;
  unavailableFacultySlots: number;
  totalTeachingSlots: number;
  totalRequiredPeriods: number;
  validationErrors: number;
  validationWarnings: number;
  ready: boolean;
}
