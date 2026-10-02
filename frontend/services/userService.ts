import apiClient from "./api";
import { User, UserCreateFormData, UserUpdateFormData } from "@/types";

export const userService = {
  async listUsers(params?: { role?: string; isActive?: boolean }): Promise<User[]> {
    const res = await apiClient.get<User[]>("/users", { params });
    return res.data;
  },

  async getUserById(id: string): Promise<User> {
    const res = await apiClient.get<User>(`/users/${id}`);
    return res.data;
  },

  async createUser(data: UserCreateFormData): Promise<User> {
    const res = await apiClient.post<User>("/users", data);
    return res.data;
  },

  async updateUser(id: string, data: UserUpdateFormData): Promise<User> {
    const res = await apiClient.put<User>(`/users/${id}`, data);
    return res.data;
  },

  async activateUser(id: string): Promise<User> {
    const res = await apiClient.patch<User>(`/users/${id}/activate`);
    return res.data;
  },

  async deactivateUser(id: string): Promise<User> {
    const res = await apiClient.patch<User>(`/users/${id}/deactivate`);
    return res.data;
  },

  async resetPassword(id: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/users/${id}/reset-password`, {
      newPassword,
    });
    return res.data;
  },
};

export default userService;
