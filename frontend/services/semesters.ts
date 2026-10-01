import apiClient from "./api";
import { Semester, SemesterFormData, ApiResponse } from "@/types";

export const semestersService = {
  async getAll(params?: { programmeId?: string; isActive?: boolean }): Promise<Semester[]> {
    const res = await apiClient.get<ApiResponse<Semester[]>>("/semesters", { params });
    return res.data.data;
  },

  async getById(id: string): Promise<Semester> {
    const res = await apiClient.get<ApiResponse<Semester>>(`/semesters/${id}`);
    return res.data.data;
  },

  async create(data: SemesterFormData): Promise<Semester> {
    const res = await apiClient.post<ApiResponse<Semester>>("/semesters", data);
    return res.data.data;
  },

  async update(id: string, data: Partial<SemesterFormData>): Promise<Semester> {
    const res = await apiClient.put<ApiResponse<Semester>>(`/semesters/${id}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/semesters/${id}`);
  },
};

export default semestersService;
