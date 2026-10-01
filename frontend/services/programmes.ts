import apiClient from "./api";
import { Programme, ProgrammeFormData, ApiResponse, PaginatedResponse } from "@/types";

export const programmesService = {
  async getAll(params?: {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Programme>> {
    const res = await apiClient.get<PaginatedResponse<Programme>>("/programmes", { params });
    return res.data;
  },

  async getById(id: string): Promise<Programme> {
    const res = await apiClient.get<ApiResponse<Programme>>(`/programmes/${id}`);
    return res.data.data;
  },

  async create(data: ProgrammeFormData): Promise<Programme> {
    const res = await apiClient.post<ApiResponse<Programme>>("/programmes", data);
    return res.data.data;
  },

  async update(id: string, data: Partial<ProgrammeFormData>): Promise<Programme> {
    const res = await apiClient.put<ApiResponse<Programme>>(`/programmes/${id}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/programmes/${id}`);
  },
};

export default programmesService;
