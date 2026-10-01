import { BaseEntity } from "./api";

export type Class = ClassEntity;

export interface ClassEntity extends BaseEntity {
  name: string;
  displayName: string;
  programmeId: string;
  semesterId: string;
  academicYearId: string;
  semesterTypeId: string;
  section?: string;
  studentStrength: number;
  programmeName?: string;
  semesterName?: string;
  academicYearName?: string;
  semesterTypeName?: string;
}

export interface ClassFormData {
  name: string;
  displayName: string;
  programmeId: string;
  semesterId: string;
  academicYearId: string;
  semesterTypeId: string;
  section?: string;
  studentStrength: number;
  isActive?: boolean;
}
