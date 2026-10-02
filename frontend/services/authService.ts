import apiClient from "./api";
import { UserLoginResponse, AuthMeResponse } from "@/types";

export const authService = {
  async login(emailOrUsername: string, password: string): Promise<UserLoginResponse> {
    const res = await apiClient.post<UserLoginResponse>("/auth/login", {
      email: emailOrUsername,
      password,
    });
    if (res.data.token && typeof window !== "undefined") {
      localStorage.setItem("auth_token", res.data.token);
      localStorage.setItem("current_user", JSON.stringify(res.data.user));
      localStorage.setItem("user_permissions", JSON.stringify(res.data.permissions));
    }
    return res.data;
  },

  async getMe(): Promise<AuthMeResponse> {
    const res = await apiClient.get<AuthMeResponse>("/auth/me");
    if (typeof window !== "undefined") {
      localStorage.setItem("current_user", JSON.stringify(res.data.user));
      localStorage.setItem("user_permissions", JSON.stringify(res.data.permissions));
    }
    return res.data;
  },

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("current_user");
      localStorage.removeItem("user_permissions");
    }
  },

  getCurrentUser(): any {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("current_user");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
  },

  getPermissions(): string[] {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user_permissions");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return [];
        }
      }
    }
    return [];
  },
};

export default authService;
