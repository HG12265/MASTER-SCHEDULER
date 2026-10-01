import apiClient from "./api";
import { ClassEntity, ClassFormData, ApiResponse, PaginatedResponse } from "@/types";

export const classesService = {
  async getAll(params?: {
    programmeId?: string;
    semesterId?: string;
    academicYearId?: string;
    semesterTypeId?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<ClassEntity>> {
    const res = await apiClient.get<PaginatedResponse<ClassEntity>>("/classes", { params });
    return res.data;
  },

  async getById(id: string): Promise<ClassEntity> {
    const res = await apiClient.get<ApiResponse<ClassEntity>>(`/classes/${id}`);
    return res.data.data;
  },

  async create(data: ClassFormData): Promise<ClassEntity> {
    const res = await apiClient.post<ApiResponse<ClassEntity>>("/classes", data);
    return res.data.data;
  },

  async update(id: string, data: Partial<ClassFormData>): Promise<ClassEntity> {
    const res = await apiClient.put<ApiResponse<ClassEntity>>(`/classes/${id}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/classes/${id}`);
  },
};

export default classesService;
