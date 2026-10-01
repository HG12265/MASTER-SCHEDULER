import apiClient from "./api";
import { ApiResponse } from "@/types";
import {
  MovePreviewRequest,
  MovePreviewResponse,
  ApplyMoveRequest,
  SwapPreviewRequest,
  SwapPreviewResponse,
  ApplySwapRequest,
  ManualEntryCreateRequest,
  RegenerationScope,
  RegenerationPreviewResponse,
  TimetableChangeHistory,
  TimetableValidationReport,
} from "@/types/timetableEdit";

export const timetableEditService = {
  async previewMove(
    timetableId: string,
    payload: MovePreviewRequest
  ): Promise<MovePreviewResponse> {
    const res = await apiClient.post<ApiResponse<MovePreviewResponse>>(
      `/timetables/${timetableId}/edit/preview-move`,
      payload
    );
    return res.data.data;
  },

  async applyMove(
    timetableId: string,
    entryId: string,
    payload: ApplyMoveRequest
  ): Promise<any> {
    const res = await apiClient.patch<ApiResponse<any>>(
      `/timetables/${timetableId}/entries/${entryId}/move`,
      payload
    );
    return res.data.data;
  },

  async previewSwap(
    timetableId: string,
    payload: SwapPreviewRequest
  ): Promise<SwapPreviewResponse> {
    const res = await apiClient.post<ApiResponse<SwapPreviewResponse>>(
      `/timetables/${timetableId}/edit/preview-swap`,
      payload
    );
    return res.data.data;
  },

  async applySwap(
    timetableId: string,
    payload: ApplySwapRequest
  ): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>(
      `/timetables/${timetableId}/edit/swap`,
      payload
    );
    return res.data.data;
  },

  async manualAddEntry(
    timetableId: string,
    payload: ManualEntryCreateRequest
  ): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>(
      `/timetables/${timetableId}/entries`,
      payload
    );
    return res.data.data;
  },

  async removeEntry(
    timetableId: string,
    entryId: string,
    expectedRevision: number
  ): Promise<any> {
    const res = await apiClient.delete<ApiResponse<any>>(
      `/timetables/${timetableId}/entries/${entryId}`,
      {
        params: { expectedRevision },
      }
    );
    return res.data.data;
  },

  async lockEntry(timetableId: string, entryId: string): Promise<any> {
    const res = await apiClient.patch<ApiResponse<any>>(
      `/timetables/${timetableId}/entries/${entryId}/lock`
    );
    return res.data.data;
  },

  async unlockEntry(timetableId: string, entryId: string): Promise<any> {
    const res = await apiClient.patch<ApiResponse<any>>(
      `/timetables/${timetableId}/entries/${entryId}/unlock`
    );
    return res.data.data;
  },

  async previewRegeneration(
    timetableId: string,
    payload: {
      scope: RegenerationScope;
      preserveLockedEntries?: boolean;
      solverOptions?: { maxSolveSeconds?: number; numSearchWorkers?: number };
    }
  ): Promise<RegenerationPreviewResponse> {
    const res = await apiClient.post<ApiResponse<RegenerationPreviewResponse>>(
      `/timetables/${timetableId}/regenerate/preview`,
      payload
    );
    return res.data.data;
  },

  async applyRegeneration(
    timetableId: string,
    payload: { previewToken: string; expectedRevision: number }
  ): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>(
      `/timetables/${timetableId}/regenerate/apply`,
      payload
    );
    return res.data.data;
  },

  async getHistory(timetableId: string): Promise<TimetableChangeHistory[]> {
    const res = await apiClient.get<ApiResponse<TimetableChangeHistory[]>>(
      `/timetables/${timetableId}/history`
    );
    return res.data.data || [];
  },

  async undoChange(
    timetableId: string,
    changeId: string,
    expectedRevision: number
  ): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>(
      `/timetables/${timetableId}/history/${changeId}/undo`,
      { expectedRevision }
    );
    return res.data.data;
  },

  async validateTimetable(
    timetableId: string
  ): Promise<TimetableValidationReport> {
    const res = await apiClient.post<ApiResponse<TimetableValidationReport>>(
      `/timetables/${timetableId}/validate`
    );
    return res.data.data;
  },
};
