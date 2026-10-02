export type UserRole = "SUPER_ADMIN" | "ADMIN" | "HOD" | "FACULTY" | "VIEWER";

export type Permission =
  | "users.manage"
  | "users.view"
  | "academic.manage"
  | "faculty.manage"
  | "subjects.manage"
  | "scheduler.configure"
  | "scheduler.generate"
  | "timetable.edit"
  | "timetable.publish"
  | "leave.request"
  | "leave.manage"
  | "substitution.manage"
  | "reports.view"
  | "exports.download"
  | "audit.view"
  | "backup.manage"
  | "settings.manage";

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  facultyId?: string | null;
  facultyName?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  passwordChangedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserCreateFormData {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  facultyId?: string | null;
  isActive?: boolean;
}

export interface UserUpdateFormData {
  username?: string;
  email?: string;
  role?: UserRole;
  facultyId?: string | null;
  isActive?: boolean;
}

export interface UserLoginResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: User;
  permissions: string[];
}

export interface AuthMeResponse {
  user: User;
  permissions: string[];
}

// ==========================================
// LEAVE MANAGEMENT
// ==========================================

export type LeaveType = "CASUAL" | "MEDICAL" | "DUTY" | "ON_DUTY" | "OTHER";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface LeaveRequest {
  id: string;
  facultyId: string;
  facultyName?: string | null;
  facultyCode?: string | null;
  department?: string | null;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  fullDay: boolean;
  affectedTimeSlotIds: string[];
  reason: string;
  status: LeaveStatus;
  requestedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewNotes?: string | null;
  affectedPeriodsCount?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveRequestCreateFormData {
  facultyId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  fullDay: boolean;
  affectedTimeSlotIds?: string[];
  reason: string;
}

export interface AffectedPeriodItem {
  date: string;
  entryId: string;
  timetableId: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  timeSlotId: string;
  timeSlotName: string;
  startTime: string;
  endTime: string;
  slotOrder: number;
  workingDayId: string;
  workingDayName: string;
  resourceId?: string | null;
  resourceName?: string | null;
  coFacultyIds: string[];
  coFacultyNames: string[];
  isMultiFaculty: boolean;
  substitutionStatus?: string | null;
  substituteFacultyId?: string | null;
  substituteFacultyName?: string | null;
}

export interface LeaveImpactResponse {
  leaveRequestId?: string | null;
  facultyId: string;
  facultyName: string;
  facultyCode: string;
  startDate: string;
  endDate: string;
  totalTeachingDays: number;
  totalAffectedPeriods: number;
  affectedPeriods: AffectedPeriodItem[];
}

// ==========================================
// ACADEMIC CALENDAR
// ==========================================

export type CalendarExceptionType =
  | "HOLIDAY"
  | "WORKING_SATURDAY"
  | "SPECIAL_WORKING_DAY"
  | "EXAM_DAY"
  | "NO_CLASS_DAY"
  | "OTHER";

export interface AcademicCalendarException {
  id: string;
  academicYearId: string;
  academicYearName?: string | null;
  date: string;
  type: CalendarExceptionType;
  title: string;
  isTeachingDay: boolean;
  mappedWorkingDayId?: string | null;
  mappedWorkingDayName?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DateLookupResponse {
  date: string;
  dayOfWeek: string;
  isWorkingDay: boolean;
  isTeachingDay: boolean;
  effectiveWorkingDayId?: string | null;
  effectiveWorkingDayName?: string | null;
  isException: boolean;
  exceptionType?: string | null;
  exceptionTitle?: string | null;
}

// ==========================================
// SUBSTITUTIONS & OPERATIONS
// ==========================================

export type SubstitutionStatus = "PROPOSED" | "ASSIGNED" | "CANCELLED" | "COMPLETED";
export type AssignmentType = "SUBSTITUTION" | "CANCELLED" | "ACTIVITY" | "RESCHEDULED";

export interface CandidateReason {
  category: string;
  detail: string;
  isPositive: boolean;
}

export interface SubstituteCandidate {
  facultyId: string;
  facultyName: string;
  facultyCode: string;
  department?: string | null;
  designation?: string | null;
  matchScore: number;
  isAllocatedToSubject: boolean;
  isAllocatedToClass: boolean;
  isAllocatedToProgramme: boolean;
  scheduledPeriodsToday: number;
  weeklyScheduledHours: number;
  reasons: string[];
  reasonsStructured: CandidateReason[];
}

export interface SubstitutionCandidateResponse {
  date: string;
  originalEntryId: string;
  absentFacultyId: string;
  absentFacultyName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  timeSlotId: string;
  timeSlotName: string;
  startTime: string;
  endTime: string;
  candidates: SubstituteCandidate[];
}

export interface Substitution {
  id: string;
  date: string;
  publishedTimetableId: string;
  originalEntryId: string;
  absentFacultyId: string;
  absentFacultyName?: string | null;
  substituteFacultyId?: string | null;
  substituteFacultyName?: string | null;
  classId: string;
  className?: string | null;
  subjectId: string;
  subjectName?: string | null;
  subjectCode?: string | null;
  workingDayId: string;
  workingDayName?: string | null;
  timeSlotId: string;
  timeSlotName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  resourceId?: string | null;
  resourceName?: string | null;
  status: SubstitutionStatus;
  assignmentType: AssignmentType;
  notes?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyScheduleSession {
  entryId: string;
  timetableId: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  timeSlotId: string;
  timeSlotName: string;
  startTime: string;
  endTime: string;
  slotOrder: number;
  resourceId?: string | null;
  resourceName?: string | null;
  scheduledFacultyIds: string[];
  scheduledFacultyNames: string[];
  effectiveFacultyId?: string | null;
  effectiveFacultyName?: string | null;
  isMultiFaculty: boolean;
  sessionStatus: "NORMAL" | "SUBSTITUTED" | "CANCELLED" | "ACTIVITY" | "UNRESOLVED";
  substitutionId?: string | null;
  assignmentType?: string | null;
  notes?: string | null;
}

export interface DailyScheduleSummary {
  date: string;
  dayOfWeek: string;
  isTeachingDay: boolean;
  isException: boolean;
  exceptionTitle?: string | null;
  effectiveWorkingDayId?: string | null;
  effectiveWorkingDayName?: string | null;
  scheduledClassesCount: number;
  facultyOnLeaveCount: number;
  substitutionsCount: number;
  cancelledPeriodsCount: number;
  unresolvedPeriodsCount: number;
  facultyOnLeave: {
    facultyId: string;
    facultyName: string;
    facultyCode: string;
    leaveType: string;
    fullDay: boolean;
    affectedTimeSlotIds?: string[];
    reason?: string;
  }[];
  sessions: DailyScheduleSession[];
}

// ==========================================
// NOTIFICATIONS
// ==========================================

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

// ==========================================
// AUDIT LOG
// ==========================================

export interface AuditLogItem {
  id: string;
  userId?: string | null;
  username?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

// ==========================================
// SYSTEM SETTINGS & INTEGRITY
// ==========================================

export interface SubstitutionPolicy {
  allowOvertimeSubstitutes: boolean;
  autoNotifySubstitutes: boolean;
  requireApprovalForLeave: boolean;
  prioritizeSameSubject: boolean;
}

export interface SystemSettings {
  id?: string;
  defaultAcademicYearId?: string | null;
  defaultSemesterTypeId?: string | null;
  defaultTimezone: string;
  dateFormat: string;
  timeFormat: string;
  substitutionPolicies: SubstitutionPolicy;
  notificationPreferences: Record<string, boolean>;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface IntegrityIssue {
  severity: "ERROR" | "WARNING" | "INFO";
  category: string;
  entityType: string;
  entityId?: string | null;
  entityIdentifier?: string | null;
  description: string;
  suggestedFix?: string | null;
}

export interface IntegrityCheckResult {
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  passed: boolean;
  issues: IntegrityIssue[];
  checkedAt: string;
}

// ==========================================
// BACKUP & RESTORE
// ==========================================

export interface BackupManifest {
  application: string;
  backupSchemaVersion: number;
  createdAt: string;
  createdBy?: string | null;
  collections: string[];
  totalRecords: number;
  environment: string;
}

export interface BackupHistoryItem {
  id: string;
  filename: string;
  createdAt: string;
  createdBy?: string | null;
  backupSchemaVersion: number;
  collectionCount: number;
  recordCount: number;
  fileSizeBytes?: number | null;
}

export interface BackupValidationResult {
  isValid: boolean;
  schemaVersion?: number | null;
  createdAt?: string | null;
  collectionCounts: Record<string, number>;
  totalRecords: number;
  errors: string[];
  warnings: string[];
}

export interface BackupPreviewResponse {
  canRestore: boolean;
  manifest?: BackupManifest | null;
  collectionCounts: Record<string, number>;
  recordsToAdd: number;
  recordsToUpdate: number;
  warnings: string[];
  errors: string[];
}

// ==========================================
// OPERATIONAL REPORTS
// ==========================================

export interface SubstitutionReportItem {
  substitutionId: string;
  date: string;
  absentFacultyId: string;
  absentFacultyName: string;
  substituteFacultyId?: string | null;
  substituteFacultyName?: string | null;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  timeSlotName: string;
  status: string;
  assignmentType: string;
}

export interface SubstitutionReport {
  startDate?: string | null;
  endDate?: string | null;
  totalSubstitutions: number;
  assignedCount: number;
  cancelledCount: number;
  items: SubstitutionReportItem[];
}

export interface FacultyOperationalWorkloadItem {
  facultyId: string;
  facultyName: string;
  facultyCode: string;
  department?: string | null;
  designation?: string | null;
  regularScheduledPeriods: number;
  substitutePeriods: number;
  totalOperationalPeriods: number;
  approvedLeaveDays: number;
}

export interface FacultyOperationalWorkloadReport {
  startDate?: string | null;
  endDate?: string | null;
  totalFaculty: number;
  items: FacultyOperationalWorkloadItem[];
}
