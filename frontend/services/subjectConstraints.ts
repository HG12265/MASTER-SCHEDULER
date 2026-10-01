import apiClient from "./api";
import {
  SubjectConstraint,
  SubjectConstraintFormData,
  ApiResponse,
} from "@/types";

export const subjectConstraintsService = {
  async getAll(params?: {
    academicYearId?: string;
    semesterTypeId?: string;
    classId?: string;
    subjectId?: string;
    isActive?: boolean;
  }): Promise<SubjectConstraint[]> {
    const res = await apiClient.get<ApiResponse<SubjectConstraint[]>>("/subject-constraints", {
      params,
    });
    return res.data.data;
  },

  async getById(id: string): Promise<SubjectConstraint> {
    const res = await apiClient.get<ApiResponse<SubjectConstraint>>(`/subject-constraints/${id}`);
    return res.data.data;
  },

  async create(data: SubjectConstraintFormData): Promise<SubjectConstraint> {
    const res = await apiClient.post<ApiResponse<SubjectConstraint>>("/subject-constraints", data);
    return res.data.data;
  },

  async update(id: string, data: Partial<SubjectConstraintFormData>): Promise<SubjectConstraint> {
    const res = await apiClient.put<ApiResponse<SubjectConstraint>>(`/subject-constraints/${id}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/subject-constraints/${id}`);
  },
};

export default subjectConstraintsService;
