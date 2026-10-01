import { TimetableEntry, TimetableEntryType } from "./timetable";

export type TimetableEditConflictType =
  | "CLASS_CONFLICT"
  | "FACULTY_CONFLICT"
  | "RESOURCE_CONFLICT"
  | "FACULTY_UNAVAILABLE"
  | "CLASS_BLOCKED_SLOT"
  | "FACULTY_DAILY_LIMIT"
  | "FACULTY_CONSECUTIVE_LIMIT"
  | "FACULTY_WEEKLY_LIMIT"
  | "CLASS_DAILY_LIMIT"
  | "CLASS_CONSECUTIVE_LIMIT"
  | "SUBJECT_DAILY_LIMIT"
  | "SUBJECT_WEEKLY_OVERFLOW"
  | "SUBJECT_WEEKLY_SHORTAGE"
  | "FIXED_SLOT_CONFLICT"
  | "LOCKED_ENTRY"
  | "LAB_BLOCK_INVALID"
  | "NON_TEACHING_SLOT"
  | "STALE_REVISION"
  | "GENERAL_ERROR";

export interface TimetableEditConflict {
  type: TimetableEditConflictType;
  message: string;
  details?: Record<string, any>;
}

export interface MovePreviewRequest {
  entryId: string;
  targetWorkingDayId: string;
  targetTimeSlotId: string;
}

export interface MovePreviewResponse {
  valid: boolean;
  conflicts: TimetableEditConflict[];
  warnings: string[];
  affectedEntries: TimetableEntry[];
  message: string;
  blockSize: number;
  occupyingEntry?: TimetableEntry | null;
}

export interface ApplyMoveRequest {
  targetWorkingDayId: string;
  targetTimeSlotId: string;
  expectedRevision: number;
}

export interface SwapPreviewRequest {
  firstEntryId: string;
  secondEntryId: string;
}

export interface SwapPreviewResponse {
  valid: boolean;
  conflicts: TimetableEditConflict[];
  warnings: string[];
  message: string;
}

export interface ApplySwapRequest {
  firstEntryId: string;
  secondEntryId: string;
  expectedRevision: number;
}

export interface ManualEntryCreateRequest {
  classId: string;
  workingDayId: string;
  timeSlotId: string;
  entryType: TimetableEntryType;
  subjectId?: string;
  facultyIds?: string[];
  resourceId?: string;
  title?: string;
  lockAfterAdding?: boolean;
  expectedRevision: number;
}

export interface RegenerationScope {
  classIds?: string[];
  facultyIds?: string[];
  workingDayIds?: string[];
  timeSlotIds?: string[];
  entryIds?: string[];
}

export interface MovedEntryDiff {
  entryId: string;
  subjectName?: string;
  subjectCode?: string;
  className?: string;
  fromDayName?: string;
  fromTimeSlotName?: string;
  toDayName?: string;
  toTimeSlotName?: string;
}

export interface RegenerationPreviewResponse {
  previewToken: string;
  solverStatus: string;
  success: boolean;
  message: string;
  changedEntries: number;
  addedEntries: number;
  removedEntries: number;
  movedEntries: MovedEntryDiff[];
  warnings: string[];
  expectedRevision: number;
}

export interface TimetableChangeHistory {
  id: string;
  timetableId: string;
  revision: number;
  changeType: string;
  description: string;
  affectedEntryIds: string[];
  performedAt: string;
  performedBy?: string | null;
  reverted: boolean;
  revertedAt?: string | null;
}

export interface TimetableValidationIssue {
  code: string;
  severity: "ERROR" | "WARNING" | "INFO";
  message: string;
  entityType?: string;
  entityId?: string;
}

export interface TimetableValidationSummary {
  errors: number;
  warnings: number;
}

export interface TimetableValidationReport {
  status: "VALID" | "INVALID" | "NOT_VALIDATED";
  summary: TimetableValidationSummary;
  issues: TimetableValidationIssue[];
}
