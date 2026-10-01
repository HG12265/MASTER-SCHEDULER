"use client";

import React from "react";
import { AlertTriangle, X, ShieldAlert, Info } from "lucide-react";
import { TimetableEditConflict } from "@/types/timetableEdit";

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  conflicts: TimetableEditConflict[];
  warnings?: string[];
}

export function ConflictModal({
  isOpen,
  onClose,
  title = "Move / Edit Blocked",
  conflicts,
  warnings = [],
}: ConflictModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl shadow-rose-950/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-rose-950/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-rose-300/80">
                Rule violations detected by backend constraint engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {conflicts.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Hard Invariant Violations ({conflicts.length})
              </div>
              {conflicts.map((c, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-rose-200 text-xs leading-relaxed space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 uppercase tracking-wider font-semibold">
                      {c.type}
                    </span>
                  </div>
                  <p className="pt-0.5">{c.message}</p>
                </div>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Soft Preference Warnings ({warnings.length})
              </div>
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/30 text-amber-200 text-xs"
                >
                  {w}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-800 bg-slate-900/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition shadow"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
