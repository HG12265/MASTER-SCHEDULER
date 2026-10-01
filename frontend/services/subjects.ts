import apiClient from "./api";
import { Subject, SubjectFormData, ApiResponse, PaginatedResponse } from "@/types";

export const subjectsService = {
  async getAll(params?: {
    programmeId?: string;
    semesterId?: string;
    subjectType?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Subject>> {
    const res = await apiClient.get<PaginatedResponse<Subject>>("/subjects", { params });
    return res.data;
  },

  async getById(id: string): Promise<Subject> {
    const res = await apiClient.get<ApiResponse<Subject>>(`/subjects/${id}`);
    return res.data.data;
  },

  async create(data: SubjectFormData): Promise<Subject> {
    const res = await apiClient.post<ApiResponse<Subject>>("/subjects", data);
    return res.data.data;
  },

  async update(id: string, data: Partial<SubjectFormData>): Promise<Subject> {
    const res = await apiClient.put<ApiResponse<Subject>>(`/subjects/${id}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/subjects/${id}`);
  },
};

export default subjectsService;
