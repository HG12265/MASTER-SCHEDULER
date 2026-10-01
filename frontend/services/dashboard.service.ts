import apiClient from "@/lib/api-client";

export interface DashboardSummaryData {
  programmes: number;
  classes: number;
  faculty: number;
  subjects: number;
  resources: number;
  allocations: number;
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
