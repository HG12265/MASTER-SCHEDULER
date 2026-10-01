import { BaseEntity } from "./api";

export interface Programme extends BaseEntity {
  name: string;
  code: string;
  shortName: string;
  totalSemesters: number;
  description?: string;
}

export interface ProgrammeFormData {
  name: string;
  code: string;
  shortName: string;
  totalSemesters: number;
  description?: string;
  isActive?: boolean;
}
