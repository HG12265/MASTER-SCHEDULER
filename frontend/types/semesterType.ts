import { BaseEntity } from "./api";

export interface SemesterType extends BaseEntity {
  name: string;
  code: string;
  description?: string;
}

export interface SemesterTypeFormData {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
}
