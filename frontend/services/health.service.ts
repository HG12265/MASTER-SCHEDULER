import apiClient from "@/lib/api-client";

export interface HealthStatusResponse {
  status: string;
  message: string;
}

export const healthService = {
  async getHealthStatus(): Promise<HealthStatusResponse> {
    const response = await apiClient.get<HealthStatusResponse>("/health");
    return response.data;
  },
};
