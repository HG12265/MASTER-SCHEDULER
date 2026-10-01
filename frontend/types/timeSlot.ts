import { BaseEntity } from "./api";

export interface TimeSlot extends BaseEntity {
  name: string;
  startTime: string;
  endTime: string;
  slotOrder: number;
  slotType: "PERIOD" | "BREAK" | "LUNCH" | string;
  isTeachingSlot: boolean;
}

export interface TimeSlotFormData {
  name: string;
  startTime: string;
  endTime: string;
  slotOrder: number;
  slotType: string;
  isTeachingSlot?: boolean;
  isActive?: boolean;
}
