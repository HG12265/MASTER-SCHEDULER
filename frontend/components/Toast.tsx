"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    showToast: (message: string, type?: ToastType) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto dismiss after 4.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const success = useCallback((msg: string) => addToast("success", msg), [addToast]);
  const error = useCallback((msg: string) => addToast("error", msg), [addToast]);
  const info = useCallback((msg: string) => addToast("info", msg), [addToast]);
  const showToast = useCallback(
    (msg: string, type: ToastType = "info") => addToast(type, msg),
    [addToast]
  );

  const toast = useMemo(
    () => ({
      success,
      error,
      info,
      showToast,
    }),
    [success, error, info, showToast]
  );

  const contextValue = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast container floating at top-right */}
      <div className="fixed top-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start justify-between p-3.5 rounded-xl shadow-lg border text-xs font-medium transition-all duration-300 transform translate-y-0 opacity-100",
              t.type === "success" && "bg-white border-emerald-200 text-emerald-950 shadow-emerald-500/10",
              t.type === "error" && "bg-white border-rose-200 text-rose-950 shadow-rose-500/10",
              t.type === "info" && "bg-white border-indigo-200 text-indigo-950 shadow-indigo-500/10"
            )}
          >
            <div className="flex items-start space-x-2.5 flex-1 pr-2">
              {t.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              {t.type === "error" && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              {t.type === "info" && <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />}
              <span className="leading-relaxed">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-700 p-0.5 -mt-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      success: (msg: string) => {
        if (typeof window !== "undefined") console.log("[Toast Success]", msg);
      },
      error: (msg: string) => {
        if (typeof window !== "undefined") console.error("[Toast Error]", msg);
      },
      info: (msg: string) => {
        if (typeof window !== "undefined") console.log("[Toast Info]", msg);
      },
      showToast: (msg: string, type: ToastType = "info") => {
        if (typeof window !== "undefined") console.log(`[Toast ${type}]`, msg);
      },
    };
  }
  return context.toast;
}
