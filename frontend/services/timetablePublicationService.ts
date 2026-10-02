import apiClient from "./api";
import { Timetable, ApiResponse } from "@/types";

export interface PublicationActionResponse {
  success: boolean;
  message: string;
  data: Timetable;
}

export const timetablePublicationService = {
  async submitForApproval(timetableId: string): Promise<PublicationActionResponse> {
    const res = await apiClient.post<PublicationActionResponse>(
      `/timetables/${timetableId}/submit-for-approval`
    );
    return res.data;
  },

  async returnToDraft(timetableId: string): Promise<PublicationActionResponse> {
    const res = await apiClient.post<PublicationActionResponse>(
      `/timetables/${timetableId}/return-to-draft`
    );
    return res.data;
  },

  async publish(timetableId: string): Promise<PublicationActionResponse> {
    const res = await apiClient.post<PublicationActionResponse>(
      `/timetables/${timetableId}/publish`
    );
    return res.data;
  },

  async archive(timetableId: string): Promise<PublicationActionResponse> {
    const res = await apiClient.post<PublicationActionResponse>(
      `/timetables/${timetableId}/archive`
    );
    return res.data;
  },

  async createDraftCopy(timetableId: string): Promise<PublicationActionResponse> {
    const res = await apiClient.post<PublicationActionResponse>(
      `/timetables/${timetableId}/create-draft-copy`
    );
    return res.data;
  },

  async getExportHistory(timetableId: string): Promise<any[]> {
    const res = await apiClient.get<ApiResponse<any[]>>(
      `/timetables/${timetableId}/export-history`
    );
    return res.data.data || [];
  },
};

export default timetablePublicationService;
