import apiClient from "./api";
import { SemesterType, SemesterTypeFormData, ApiResponse } from "@/types";

export const semesterTypesService = {
  async getAll(): Promise<SemesterType[]> {
    const res = await apiClient.get<ApiResponse<SemesterType[]>>("/semester-types");
    return res.data.data;
  },

  async getById(id: string): Promise<SemesterType> {
    const res = await apiClient.get<ApiResponse<SemesterType>>(`/semester-types/${id}`);
    return res.data.data;
  },

  async create(data: SemesterTypeFormData): Promise<SemesterType> {
    const res = await apiClient.post<ApiResponse<SemesterType>>("/semester-types", data);
    return res.data.data;
  },

  async update(id: string, data: Partial<SemesterTypeFormData>): Promise<SemesterType> {
    const res = await apiClient.put<ApiResponse<SemesterType>>(`/semester-types/${id}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/semester-types/${id}`);
  },
};

export default semesterTypesService;
