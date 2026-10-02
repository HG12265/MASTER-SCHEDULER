import apiClient from "@/lib/api-client";

export interface AttentionItem {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error";
  actionUrl?: string;
}

export interface WorkloadBarData {
  facultyId: string;
  facultyName: string;
  facultyCode: string;
  scheduledHours: number;
  maxWeeklyHours: number;
  utilizationPercent: number;
}

export interface ResourceBarData {
  resourceId: string;
  resourceName: string;
  resourceCode: string;
  resourceType: string;
  usedSlots: number;
  availableSlots: number;
  utilizationPercent: number;
}

export interface DashboardSummaryData {
  programmes: number;
  classes: number;
  faculty: number;
  subjects: number;
  resources: number;
  allocations: number;

  activeAcademicYear?: { id: string; name: string; isCurrent: boolean };
  currentSemesterType?: { id: string; name: string; code: string };
  latestTimetable?: {
    id: string;
    version: number;
    status: string;
    validationStatus: string;
    academicYearName: string;
    semesterTypeName: string;
    totalSlots: number;
    generatedAt: string;
    publishedAt?: string;
  };

  publishedTimetablesCount: number;
  readyForApprovalCount: number;
  draftTimetablesCount: number;
  archivedTimetablesCount: number;
  totalTimetablesCount: number;
  validationIssuesCount: number;

  attentionItems: AttentionItem[];
  facultyWorkloadChart: WorkloadBarData[];
  resourceUtilizationChart: ResourceBarData[];
}

export interface DashboardSummaryResponse {
  success: boolean;
  message: string;
  data: DashboardSummaryData;
}

export const dashboardService = {
  async getSummary(): Promise<DashboardSummaryData> {
    const response = await apiClient.get<DashboardSummaryResponse>("/dashboard/summary");
    return response.data.data;
  },
};

export default dashboardService;
