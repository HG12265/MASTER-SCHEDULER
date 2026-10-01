import apiClient from "./api";
import { WorkingDay, WorkingDayFormData, ApiResponse } from "@/types";

export const workingDaysService = {
  async getAll(): Promise<WorkingDay[]> {
    const res = await apiClient.get<ApiResponse<WorkingDay[]>>("/working-days");
    return res.data.data;
  },

  async getById(id: string): Promise<WorkingDay> {
    const res = await apiClient.get<ApiResponse<WorkingDay>>(`/working-days/${id}`);
    return res.data.data;
  },

  async create(data: WorkingDayFormData): Promise<WorkingDay> {
    const res = await apiClient.post<ApiResponse<WorkingDay>>("/working-days", data);
    return res.data.data;
  },

  async update(id: string, data: Partial<WorkingDayFormData>): Promise<WorkingDay> {
    const res = await apiClient.put<ApiResponse<WorkingDay>>(`/working-days/${id}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/working-days/${id}`);
  },
};

export default workingDaysService;
