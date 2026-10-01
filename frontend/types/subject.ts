import { BaseEntity } from "./api";

export type SubjectType = "THEORY" | "LAB" | "TUTORIAL" | "OTHER";

export interface Subject extends BaseEntity {
  subjectCode: string;
  name: string;
  programmeId: string;
  semesterId: string;
  subjectType: SubjectType | string;
  defaultWeeklyHours: number;
  defaultBlockSize: number;
  requiresConsecutivePeriods: boolean;
  description?: string;
  programmeName?: string;
  semesterName?: string;
}

export interface SubjectFormData {
  subjectCode: string;
  name: string;
  programmeId: string;
  semesterId: string;
  subjectType: string;
  defaultWeeklyHours: number;
  defaultBlockSize: number;
  requiresConsecutivePeriods?: boolean;
  description?: string;
  isActive?: boolean;
}
