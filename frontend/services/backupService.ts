import apiClient from "./api";
import {
  BackupValidationResult,
  BackupPreviewResponse,
  BackupHistoryItem,
} from "@/types";

export const backupService = {
  async exportBackup(): Promise<Blob> {
    const res = await apiClient.post("/system/backups/export", {}, { responseType: "blob" });
    return res.data;
  },

  async validateBackup(file: File): Promise<BackupValidationResult> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post<BackupValidationResult>("/system/backups/validate", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  async previewRestore(file: File): Promise<BackupPreviewResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post<BackupPreviewResponse>("/system/backups/preview", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  async restoreBackup(file: File, confirm: boolean = true): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("confirm", String(confirm));
    const res = await apiClient.post("/system/backups/restore", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  async getHistory(): Promise<BackupHistoryItem[]> {
    const res = await apiClient.get<BackupHistoryItem[]>("/system/backups/history");
    return res.data;
  },
};

export default backupService;
