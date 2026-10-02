import { BaseEntity } from "./api";

export interface WorkingDay extends BaseEntity {
  name: string;
  dayName?: string;
  shortName: string;
  dayOrder: number;
  isWorkingDay: boolean;
}

export interface WorkingDayFormData {
  name: string;
  shortName: string;
  dayOrder: number;
  isWorkingDay?: boolean;
  isActive?: boolean;
}
