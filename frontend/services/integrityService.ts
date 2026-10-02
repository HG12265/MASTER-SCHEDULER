import apiClient from "./api";
import { IntegrityCheckResult } from "@/types";

export const integrityService = {
  async runIntegrityCheck(): Promise<IntegrityCheckResult> {
    const res = await apiClient.post<IntegrityCheckResult>("/system/integrity-check");
    return res.data;
  },
};

export default integrityService;
