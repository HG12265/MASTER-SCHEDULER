"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, UserRole } from "@/types";
import { authService } from "@/services/authService";

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  permissions: string[];
  loading: boolean;
  login: (emailOrUsername: string, pass: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (allowedRoles: UserRole | UserRole[]) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const initAuth = async () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) {
        try {
          const res = await authService.getMe();
          setUser(res.user);
          setPermissions(res.permissions || []);
        } catch (err) {
          // Token expired or invalid
          authService.logout();
          setUser(null);
          setPermissions([]);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (emailOrUsername: string, pass: string) => {
    const res = await authService.login(emailOrUsername, pass);
    setUser(res.user);
    setPermissions(res.permissions || []);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setPermissions([]);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true;
    return permissions.includes(permission);
  };

  const hasRole = (allowedRoles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true;
    const list = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return list.includes(user.role);
  };

  const refreshProfile = async () => {
    try {
      const res = await authService.getMe();
      setUser(res.user);
      setPermissions(res.permissions || []);
    } catch {
      // Ignored
    }
  };

  const role: UserRole | null = user ? user.role : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        permissions,
        loading,
        login,
        logout,
        hasPermission,
        hasRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
