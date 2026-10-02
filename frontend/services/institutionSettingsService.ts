import apiClient from "./api";
import { InstitutionSettings, ApiResponse } from "@/types";

export const institutionSettingsService = {
  async get(): Promise<InstitutionSettings> {
    const res = await apiClient.get<ApiResponse<InstitutionSettings>>("/institution-settings");
    return res.data.data;
  },

  async update(payload: Partial<InstitutionSettings>): Promise<InstitutionSettings> {
    const res = await apiClient.put<ApiResponse<InstitutionSettings>>("/institution-settings", payload);
    return res.data.data;
  },
};

export default institutionSettingsService;
