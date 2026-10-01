import apiClient from "./api";
import { TimeSlot, TimeSlotFormData, ApiResponse } from "@/types";

export const timeSlotsService = {
  async getAll(): Promise<TimeSlot[]> {
    const res = await apiClient.get<ApiResponse<TimeSlot[]>>("/time-slots");
    return res.data.data;
  },

  async getById(id: string): Promise<TimeSlot> {
    const res = await apiClient.get<ApiResponse<TimeSlot>>(`/time-slots/${id}`);
    return res.data.data;
  },

  async create(data: TimeSlotFormData): Promise<TimeSlot> {
    const res = await apiClient.post<ApiResponse<TimeSlot>>("/time-slots", data);
    return res.data.data;
  },

  async update(id: string, data: Partial<TimeSlotFormData>): Promise<TimeSlot> {
    const res = await apiClient.put<ApiResponse<TimeSlot>>(`/time-slots/${id}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/time-slots/${id}`);
  },
};

export default timeSlotsService;
