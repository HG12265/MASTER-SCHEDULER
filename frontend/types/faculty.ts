import { BaseEntity } from "./api";

export interface Faculty extends BaseEntity {
  facultyCode: string;
  code?: string;
  name: string;
  designation?: string;
  department?: string;
  email?: string;
  phone?: string;
  maxHoursPerWeek: number;
  maxHoursPerDay: number;
  maxConsecutiveHours: number;
}

export interface FacultyFormData {
  facultyCode: string;
  name: string;
  designation?: string;
  email?: string;
  phone?: string;
  maxHoursPerWeek: number;
  maxHoursPerDay: number;
  maxConsecutiveHours: number;
  isActive?: boolean;
}
