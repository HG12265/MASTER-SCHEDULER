import { BaseEntity } from "./api";

export interface AcademicYear extends BaseEntity {
  name: string;
  year?: string;
  startYear: number;
  endYear: number;
  isCurrent: boolean;
}

export interface AcademicYearFormData {
  name: string;
  startYear: number;
  endYear: number;
  isCurrent?: boolean;
  isActive?: boolean;
}
