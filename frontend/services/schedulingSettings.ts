import apiClient from "./api";
import {
  SchedulingSettings,
  SchedulingSettingsFormData,
  ApiResponse,
} from "@/types";

export const schedulingSettingsService = {
  async getAll(): Promise<SchedulingSettings[]> {
    const res = await apiClient.get<ApiResponse<SchedulingSettings[]>>("/scheduling-settings");
    return res.data.data;
  },

  async getCurrent(academicYearId?: string, semesterTypeId?: string): Promise<SchedulingSettings> {
    const res = await apiClient.get<ApiResponse<SchedulingSettings>>("/scheduling-settings/current", {
      params: { academicYearId, semesterTypeId },
    });
    return res.data.data;
  },

  async create(data: SchedulingSettingsFormData): Promise<SchedulingSettings> {
    const res = await apiClient.post<ApiResponse<SchedulingSettings>>("/scheduling-settings", data);
    return res.data.data;
  },

  async update(id: string, data: Partial<SchedulingSettingsFormData>): Promise<SchedulingSettings> {
    const res = await apiClient.put<ApiResponse<SchedulingSettings>>(`/scheduling-settings/${id}`, data);
    return res.data.data;
  },
};

export default schedulingSettingsService;
