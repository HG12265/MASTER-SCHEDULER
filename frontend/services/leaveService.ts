import apiClient from "./api";
import { LeaveRequest, LeaveRequestCreateFormData, LeaveImpactResponse } from "@/types";

export const leaveService = {
  async listLeaveRequests(params?: {
    facultyId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<LeaveRequest[]> {
    const res = await apiClient.get<LeaveRequest[]>("/leave-requests", { params });
    return res.data;
  },

  async getById(id: string): Promise<LeaveRequest> {
    const res = await apiClient.get<LeaveRequest>(`/leave-requests/${id}`);
    return res.data;
  },

  async createLeaveRequest(data: LeaveRequestCreateFormData): Promise<LeaveRequest> {
    const res = await apiClient.post<LeaveRequest>("/leave-requests", data);
    return res.data;
  },

  async previewImpact(data: LeaveRequestCreateFormData): Promise<LeaveImpactResponse> {
    const res = await apiClient.post<LeaveImpactResponse>("/leave-requests/preview-impact", data);
    return res.data;
  },

  async getImpact(id: string): Promise<LeaveImpactResponse> {
    const res = await apiClient.get<LeaveImpactResponse>(`/leave-requests/${id}/impact`);
    return res.data;
  },

  async approveLeave(id: string, reviewNotes?: string): Promise<LeaveRequest> {
    const res = await apiClient.post<LeaveRequest>(`/leave-requests/${id}/approve`, { reviewNotes });
    return res.data;
  },

  async rejectLeave(id: string, reviewNotes?: string): Promise<LeaveRequest> {
    const res = await apiClient.post<LeaveRequest>(`/leave-requests/${id}/reject`, { reviewNotes });
    return res.data;
  },

  async cancelLeave(id: string): Promise<LeaveRequest> {
    const res = await apiClient.post<LeaveRequest>(`/leave-requests/${id}/cancel`);
    return res.data;
  },
};

export default leaveService;
