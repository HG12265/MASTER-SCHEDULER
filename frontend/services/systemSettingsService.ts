import apiClient from "./api";
import { SystemSettings } from "@/types";

export const systemSettingsService = {
  async getSettings(): Promise<SystemSettings> {
    const res = await apiClient.get<SystemSettings>("/system/settings");
    return res.data;
  },

  async updateSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await apiClient.put<SystemSettings>("/system/settings", data);
    return res.data;
  },
};

export default systemSettingsService;
