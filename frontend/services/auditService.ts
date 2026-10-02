import apiClient from "./api";
import { AuditLogItem } from "@/types";

export const auditService = {
  async listLogs(params?: {
    action?: string;
    entityType?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AuditLogItem[]> {
    const res = await apiClient.get<AuditLogItem[]>("/audit-logs", { params });
    return res.data;
  },
};

export default auditService;
