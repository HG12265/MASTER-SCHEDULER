import apiClient from "./api";
import {
  FacultyAllocation,
  FacultyAllocationFormData,
  ApiResponse,
  PaginatedResponse,
} from "@/types";

export const facultyAllocationsService = {
  async getAll(params?: {
    classId?: string;
    facultyId?: string;
    subjectId?: string;
    academicYearId?: string;
    semesterTypeId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<FacultyAllocation>> {
    const res = await apiClient.get<PaginatedResponse<FacultyAllocation>>("/faculty-allocations", {
      params,
    });
    return res.data;
  },

  async getById(id: string): Promise<FacultyAllocation> {
    const res = await apiClient.get<ApiResponse<FacultyAllocation>>(`/faculty-allocations/${id}`);
    return res.data.data;
  },

  async create(data: FacultyAllocationFormData): Promise<FacultyAllocation> {
    const res = await apiClient.post<ApiResponse<FacultyAllocation>>("/faculty-allocations", data);
    return res.data.data;
  },

  async update(
    id: string,
    data: Partial<FacultyAllocationFormData>
  ): Promise<FacultyAllocation> {
    const res = await apiClient.put<ApiResponse<FacultyAllocation>>(
      `/faculty-allocations/${id}`,
      data
    );
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/faculty-allocations/${id}`);
  },
};

export default facultyAllocationsService;
