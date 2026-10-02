"use client";

import React, { ReactNode } from "react";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/context/AuthContext";


export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}

export default Providers;

