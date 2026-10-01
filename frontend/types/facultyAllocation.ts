import { BaseEntity } from "./api";

export interface FacultyAllocation extends BaseEntity {
  academicYearId: string;
  semesterTypeId: string;
  classId: string;
  subjectId: string;
  facultyIds: string[];
  weeklyHours: number;
  blockSize: number;
  requiresConsecutivePeriods: boolean;
  preferredResourceId?: string;
  notes?: string;
  className?: string;
  subjectName?: string;
  subjectCode?: string;
  facultyNames?: string[];
  academicYearName?: string;
  semesterTypeName?: string;
  preferredResourceName?: string;
}

export interface FacultyAllocationFormData {
  academicYearId: string;
  semesterTypeId: string;
  classId: string;
  subjectId: string;
  facultyIds: string[];
  weeklyHours: number;
  blockSize: number;
  requiresConsecutivePeriods?: boolean;
  preferredResourceId?: string;
  notes?: string;
  isActive?: boolean;
}
