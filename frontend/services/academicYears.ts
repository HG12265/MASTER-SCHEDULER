import apiClient from "./api";
import { AcademicYear, AcademicYearFormData, ApiResponse } from "@/types";

export const academicYearsService = {
  async getAll(): Promise<AcademicYear[]> {
    const res = await apiClient.get<ApiResponse<AcademicYear[]>>("/academic-years");
    return res.data.data;
  },

  async getById(id: string): Promise<AcademicYear> {
    const res = await apiClient.get<ApiResponse<AcademicYear>>(`/academic-years/${id}`);
    return res.data.data;
  },

  async create(data: AcademicYearFormData): Promise<AcademicYear> {
    const res = await apiClient.post<ApiResponse<AcademicYear>>("/academic-years", data);
    return res.data.data;
  },

  async update(id: string, data: Partial<AcademicYearFormData>): Promise<AcademicYear> {
    const res = await apiClient.put<ApiResponse<AcademicYear>>(`/academic-years/${id}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/academic-years/${id}`);
  },

  async setCurrent(id: string): Promise<AcademicYear> {
    const res = await apiClient.patch<ApiResponse<AcademicYear>>(`/academic-years/${id}/set-current`);
    return res.data.data;
  },
};

export default academicYearsService;
