import apiClient from "./api";
import { AppNotification, UnreadCountResponse } from "@/types";

export const notificationService = {
  async getNotifications(limit: number = 50): Promise<AppNotification[]> {
    const res = await apiClient.get<AppNotification[]>("/notifications", {
      params: { limit },
    });
    return res.data;
  },

  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<UnreadCountResponse>("/notifications/unread-count");
    return res.data.unreadCount;
  },

  async markAsRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.patch("/notifications/read-all");
  },
};

export default notificationService;
