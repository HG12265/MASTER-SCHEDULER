import apiClient from "./api";
import {
  FacultyAvailability,
  FacultyAvailabilityFormData,
  FacultyAvailabilityBulkUpdate,
  ApiResponse,
} from "@/types";

export const facultyAvailabilityService = {
  async getAll(params?: {
    academicYearId?: string;
    semesterTypeId?: string;
    facultyId?: string;
    workingDayId?: string;
    availabilityStatus?: string;
    isActive?: boolean;
  }): Promise<FacultyAvailability[]> {
    const res = await apiClient.get<ApiResponse<FacultyAvailability[]>>("/faculty-availability", {
      params,
    });
    return res.data.data;
  },

  async getById(id: string): Promise<FacultyAvailability> {
    const res = await apiClient.get<ApiResponse<FacultyAvailability>>(`/faculty-availability/${id}`);
    return res.data.data;
  },

  async create(data: FacultyAvailabilityFormData): Promise<FacultyAvailability> {
    const res = await apiClient.post<ApiResponse<FacultyAvailability>>("/faculty-availability", data);
    return res.data.data;
  },

  async bulkUpdate(data: FacultyAvailabilityBulkUpdate): Promise<Record<string, unknown>> {
    const res = await apiClient.put<ApiResponse<Record<string, unknown>>>("/faculty-availability/bulk", data);
    return res.data.data;
  },

  async update(id: string, data: Partial<FacultyAvailabilityFormData>): Promise<FacultyAvailability> {
    const res = await apiClient.put<ApiResponse<FacultyAvailability>>(`/faculty-availability/${id}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/faculty-availability/${id}`);
  },
};

export default facultyAvailabilityService;
