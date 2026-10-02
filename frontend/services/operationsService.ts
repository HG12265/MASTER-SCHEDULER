import apiClient from "./api";
import { DailyScheduleSummary } from "@/types";

export const operationsService = {
  async getDailySchedule(date?: string): Promise<DailyScheduleSummary> {
    const res = await apiClient.get<DailyScheduleSummary>("/operations/daily-schedule", {
      params: date ? { date } : {},
    });
    return res.data;
  },
};

export default operationsService;
