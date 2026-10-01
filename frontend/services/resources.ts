import apiClient from "./api";
import { ResourceItem, ResourceFormData, ApiResponse, PaginatedResponse } from "@/types";

export const resourcesService = {
  async getAll(params?: {
    resourceType?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<ResourceItem>> {
    const res = await apiClient.get<PaginatedResponse<ResourceItem>>("/resources", { params });
    return res.data;
  },

  async getById(id: string): Promise<ResourceItem> {
    const res = await apiClient.get<ApiResponse<ResourceItem>>(`/resources/${id}`);
    return res.data.data;
  },

  async create(data: ResourceFormData): Promise<ResourceItem> {
    const res = await apiClient.post<ApiResponse<ResourceItem>>("/resources", data);
    return res.data.data;
  },

  async update(id: string, data: Partial<ResourceFormData>): Promise<ResourceItem> {
    const res = await apiClient.put<ApiResponse<ResourceItem>>(`/resources/${id}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/resources/${id}`);
  },
};

export default resourcesService;
