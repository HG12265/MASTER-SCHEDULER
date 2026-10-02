import { ReactNode } from "react";

export * from "./api";
export * from "./academicYear";
export * from "./semesterType";
export * from "./workingDay";
export * from "./timeSlot";
export * from "./programme";
export * from "./semester";
export * from "./class";
export * from "./faculty";
export * from "./subject";
export * from "./resource";
export * from "./facultyAllocation";
export * from "./scheduling";
export * from "./timetable";
export * from "./timetableEdit";
export * from "./institutionSettings";
export * from "./reports";
export * from "./phase8";


export interface NavItem {
  name: string;
  href: string;
  icon: string;
  badge?: string;
  badgeColor?: "blue" | "green" | "amber" | "indigo";
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: ReactNode;
  description?: string;
  accent?: "indigo" | "emerald" | "amber" | "blue" | "purple";
}

export interface TableColumn<T> {
  key?: string;
  accessor?: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
  cell?: (item: T) => ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  keyExtractor: (item: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  searchPlaceholder?: string;
  searchableKey?: keyof T;
  isLoading?: boolean;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}
