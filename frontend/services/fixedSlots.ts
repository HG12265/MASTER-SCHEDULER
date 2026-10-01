import apiClient from "./api";
import {
  FixedSlot,
  FixedSlotFormData,
  ApiResponse,
} from "@/types";

export const fixedSlotsService = {
  async getAll(params?: {
    academicYearId?: string;
    semesterTypeId?: string;
    classId?: string;
    facultyId?: string;
    workingDayId?: string;
    slotCategory?: string;
    isActive?: boolean;
  }): Promise<FixedSlot[]> {
    const res = await apiClient.get<ApiResponse<FixedSlot[]>>("/fixed-slots", {
      params,
    });
    return res.data.data;
  },

  async getById(id: string): Promise<FixedSlot> {
    const res = await apiClient.get<ApiResponse<FixedSlot>>(`/fixed-slots/${id}`);
    return res.data.data;
  },

  async create(data: FixedSlotFormData): Promise<FixedSlot> {
    const res = await apiClient.post<ApiResponse<FixedSlot>>("/fixed-slots", data);
    return res.data.data;
  },

  async update(id: string, data: Partial<FixedSlotFormData>): Promise<FixedSlot> {
    const res = await apiClient.put<ApiResponse<FixedSlot>>(`/fixed-slots/${id}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/fixed-slots/${id}`);
  },
};

export default fixedSlotsService;
