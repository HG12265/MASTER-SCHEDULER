import apiClient from "./api";
import {
  Substitution,
  SubstitutionCandidateResponse,
  LeaveRequest,
  LeaveImpactResponse,
} from "@/types";

export const substitutionService = {
  async getCandidates(date: string, entryId: string): Promise<SubstitutionCandidateResponse> {
    const res = await apiClient.get<SubstitutionCandidateResponse>("/substitutions/candidates", {
      params: { date, entryId },
    });
    return res.data;
  },

  async assignSubstitution(data: {
    date: string;
    originalEntryId: string;
    substituteFacultyId?: string | null;
    assignmentType?: string;
    notes?: string;
  }): Promise<Substitution> {
    const res = await apiClient.post<Substitution>("/substitutions", data);
    return res.data;
  },

  async listSubstitutions(params?: {
    date?: string;
    facultyId?: string;
    classId?: string;
    status?: string;
  }): Promise<Substitution[]> {
    const res = await apiClient.get<Substitution[]>("/substitutions", { params });
    return res.data;
  },

  async cancelSubstitution(id: string): Promise<Substitution> {
    const res = await apiClient.patch<Substitution>(`/substitutions/${id}/cancel`);
    return res.data;
  },

  async emergencyFacultyAbsence(data: {
    facultyId: string;
    date: string;
    fullDay: boolean;
    affectedTimeSlotIds?: string[];
    reason: string;
  }): Promise<{ success: boolean; leaveRequest: LeaveRequest; impact: LeaveImpactResponse }> {
    const res = await apiClient.post<{ success: boolean; leaveRequest: LeaveRequest; impact: LeaveImpactResponse }>(
      "/substitutions/emergency-absence",
      data
    );
    return res.data;
  },
};

export default substitutionService;
