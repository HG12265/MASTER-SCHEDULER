import apiClient from "./api";
import {
  SchedulerValidationResult,
  SchedulerReadiness,
  ApiResponse,
} from "@/types";

export const schedulerValidationService = {
  async validate(academicYearId: string, semesterTypeId: string): Promise<SchedulerValidationResult> {
    const res = await apiClient.post<ApiResponse<SchedulerValidationResult>>("/scheduler/validate", {
      academicYearId,
      semesterTypeId,
    });
    return res.data.data;
  },

  async getReadiness(academicYearId: string, semesterTypeId: string): Promise<SchedulerReadiness> {
    const res = await apiClient.get<ApiResponse<SchedulerReadiness>>("/scheduler/readiness", {
      params: { academicYearId, semesterTypeId },
    });
    return res.data.data;
  },
};

export default schedulerValidationService;
