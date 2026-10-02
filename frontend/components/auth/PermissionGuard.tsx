"use client";

import React, { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types";

interface PermissionGuardProps {
  permission?: string;
  requiredPermissions?: string | string[];
  role?: UserRole | UserRole[];
  requiredRoles?: UserRole | UserRole[];
  fallback?: ReactNode;
  children: ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  requiredPermissions,
  role,
  requiredRoles,
  fallback = null,
  children,
}) => {
  const { user, hasPermission, hasRole, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <>{fallback}</>;
  }

  const effectivePerm = permission || requiredPermissions;
  if (effectivePerm) {
    if (Array.isArray(effectivePerm)) {
      const anyPerm = effectivePerm.some((p) => hasPermission(p));
      if (!anyPerm) return <>{fallback}</>;
    } else {
      if (!hasPermission(effectivePerm)) return <>{fallback}</>;
    }
  }

  const effectiveRole = role || requiredRoles;
  if (effectiveRole && !hasRole(effectiveRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGuard;
