import apiClient from "./api";
import { AcademicCalendarException, DateLookupResponse } from "@/types";

export const academicCalendarService = {
  async listExceptions(params?: {
    academicYearId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AcademicCalendarException[]> {
    const res = await apiClient.get<AcademicCalendarException[]>("/academic-calendar", { params });
    return res.data;
  },

  async lookupDate(date: string): Promise<DateLookupResponse> {
    const res = await apiClient.get<DateLookupResponse>("/academic-calendar/date-lookup", {
      params: { date },
    });
    return res.data;
  },

  async getById(id: string): Promise<AcademicCalendarException> {
    const res = await apiClient.get<AcademicCalendarException>(`/academic-calendar/${id}`);
    return res.data;
  },

  async createException(data: Partial<AcademicCalendarException>): Promise<AcademicCalendarException> {
    const res = await apiClient.post<AcademicCalendarException>("/academic-calendar", data);
    return res.data;
  },

  async updateException(id: string, data: Partial<AcademicCalendarException>): Promise<AcademicCalendarException> {
    const res = await apiClient.put<AcademicCalendarException>(`/academic-calendar/${id}`, data);
    return res.data;
  },

  async deleteException(id: string): Promise<void> {
    await apiClient.delete(`/academic-calendar/${id}`);
  },
};

export default academicCalendarService;
