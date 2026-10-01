import apiClient from "./api";
import {
  FacultyConstraint,
  FacultyConstraintFormData,
  ApiResponse,
} from "@/types";

export const facultyConstraintsService = {
  async getAll(params?: {
    academicYearId?: string;
    semesterTypeId?: string;
    facultyId?: string;
    isActive?: boolean;
  }): Promise<FacultyConstraint[]> {
    const res = await apiClient.get<ApiResponse<FacultyConstraint[]>>("/faculty-constraints", {
      params,
    });
    return res.data.data;
  },

  async getById(id: string): Promise<FacultyConstraint> {
    const res = await apiClient.get<ApiResponse<FacultyConstraint>>(`/faculty-constraints/${id}`);
    return res.data.data;
  },

  async create(data: FacultyConstraintFormData): Promise<FacultyConstraint> {
    const res = await apiClient.post<ApiResponse<FacultyConstraint>>("/faculty-constraints", data);
    return res.data.data;
  },

  async update(id: string, data: Partial<FacultyConstraintFormData>): Promise<FacultyConstraint> {
    const res = await apiClient.put<ApiResponse<FacultyConstraint>>(`/faculty-constraints/${id}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/faculty-constraints/${id}`);
  },
};

export default facultyConstraintsService;
