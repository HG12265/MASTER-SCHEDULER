import apiClient from "./api";
import { Faculty, FacultyFormData, ApiResponse, PaginatedResponse } from "@/types";

export const facultyService = {
  async getAll(params?: {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Faculty>> {
    const res = await apiClient.get<PaginatedResponse<Faculty>>("/faculty", { params });
    return res.data;
  },

  async getById(id: string): Promise<Faculty> {
    const res = await apiClient.get<ApiResponse<Faculty>>(`/faculty/${id}`);
    return res.data.data;
  },

  async create(data: FacultyFormData): Promise<Faculty> {
    const res = await apiClient.post<ApiResponse<Faculty>>("/faculty", data);
    return res.data.data;
  },

  async update(id: string, data: Partial<FacultyFormData>): Promise<Faculty> {
    const res = await apiClient.put<ApiResponse<Faculty>>(`/faculty/${id}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/faculty/${id}`);
  },
};

export default facultyService;
