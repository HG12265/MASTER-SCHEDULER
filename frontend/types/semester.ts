import { BaseEntity } from "./api";

export interface Semester extends BaseEntity {
  programmeId: string;
  semesterNumber: number;
  name: string;
  displayName: string;
  programmeCode?: string;
}

export interface SemesterFormData {
  programmeId: string;
  semesterNumber: number;
  name: string;
  displayName: string;
  isActive?: boolean;
}
