import apiClient from "./api";
import {
  Timetable,
  TimetableEntry,
  TimetableGenerateRequest,
  GenerateResultPayload,
  TimetableMasterView,
  ApiResponse,
} from "@/types";

export const timetablesService = {
  async generate(payload: TimetableGenerateRequest): Promise<GenerateResultPayload> {
    const res = await apiClient.post<ApiResponse<any>>("/scheduler/generate", payload);
    const apiData = res.data;
    if (!apiData.success) {
      return {
        success: false,
        message: apiData.message || "Timetable generation failed",
        solverStatus: apiData.data?.solverStatus || "INFEASIBLE",
        diagnostics: apiData.data?.diagnostics || [],
        solveTimeMs: apiData.data?.solveTimeMs,
      };
    }

    return {
      success: true,
      message: apiData.message || "Timetable generated successfully",
      timetable: apiData.data,
      solverStatus: apiData.data?.solverStatus,
      solveTimeMs: apiData.data?.generationDurationMs,
    };
  },

  async getAll(params?: {
    academicYearId?: string;
    semesterTypeId?: string;
    status?: string;
  }): Promise<Timetable[]> {
    const res = await apiClient.get<ApiResponse<Timetable[]>>("/timetables", {
      params,
    });
    return res.data.data || [];
  },

  async getById(id: string): Promise<Timetable> {
    const res = await apiClient.get<ApiResponse<Timetable>>(`/timetables/${id}`);
    return res.data.data;
  },

  async getEntries(
    timetableId: string,
    params?: {
      classId?: string;
      facultyId?: string;
      workingDayId?: string;
      timeSlotId?: string;
      subjectId?: string;
      resourceId?: string;
    }
  ): Promise<TimetableEntry[]> {
    const res = await apiClient.get<ApiResponse<TimetableEntry[]>>(
      `/timetables/${timetableId}/entries`,
      { params }
    );
    return res.data.data || [];
  },

  async getClassTimetable(timetableId: string, classId: string): Promise<TimetableEntry[]> {
    const res = await apiClient.get<ApiResponse<TimetableEntry[]>>(
      `/timetables/${timetableId}/classes/${classId}`
    );
    return res.data.data || [];
  },

  async getFacultyTimetable(timetableId: string, facultyId: string): Promise<TimetableEntry[]> {
    const res = await apiClient.get<ApiResponse<TimetableEntry[]>>(
      `/timetables/${timetableId}/faculty/${facultyId}`
    );
    return res.data.data || [];
  },

  async getMasterView(timetableId: string): Promise<TimetableMasterView> {
    const res = await apiClient.get<ApiResponse<TimetableMasterView>>(
      `/timetables/${timetableId}/master`
    );
    return res.data.data;
  },

  async delete(id: string): Promise<boolean> {
    const res = await apiClient.delete<ApiResponse<null>>(`/timetables/${id}`);
    return res.data.success;
  },
};

export default timetablesService;
