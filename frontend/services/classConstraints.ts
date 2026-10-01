import apiClient from "./api";
import {
  ClassConstraint,
  ClassConstraintFormData,
  ApiResponse,
} from "@/types";

export const classConstraintsService = {
  async getAll(params?: {
    academicYearId?: string;
    semesterTypeId?: string;
    classId?: string;
    isActive?: boolean;
  }): Promise<ClassConstraint[]> {
    const res = await apiClient.get<ApiResponse<ClassConstraint[]>>("/class-constraints", {
      params,
    });
    return res.data.data;
  },

  async getById(id: string): Promise<ClassConstraint> {
    const res = await apiClient.get<ApiResponse<ClassConstraint>>(`/class-constraints/${id}`);
    return res.data.data;
  },

  async create(data: ClassConstraintFormData): Promise<ClassConstraint> {
    const res = await apiClient.post<ApiResponse<ClassConstraint>>("/class-constraints", data);
    return res.data.data;
  },

  async update(id: string, data: Partial<ClassConstraintFormData>): Promise<ClassConstraint> {
    const res = await apiClient.put<ApiResponse<ClassConstraint>>(`/class-constraints/${id}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/class-constraints/${id}`);
  },
};

export default classConstraintsService;
