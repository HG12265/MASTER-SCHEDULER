import { BaseEntity } from "./api";

export type ResourceType = "CLASSROOM" | "LAB" | "SEMINAR_HALL" | "WORKSHOP" | string;

export interface ResourceItem extends BaseEntity {
  code: string;
  name: string;
  resourceType: ResourceType;
  capacity: number;
  location?: string;
  description?: string;
}

export interface ResourceFormData {
  code: string;
  name: string;
  resourceType: string;
  capacity: number;
  location?: string;
  description?: string;
  isActive?: boolean;
}
