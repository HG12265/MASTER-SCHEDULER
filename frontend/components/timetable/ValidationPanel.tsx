"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, Loader2, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { TimetableValidationReport } from "@/types/timetableEdit";
import { timetableEditService } from "@/services/timetableEditService";

interface ValidationPanelProps {
  timetableId: string;
  initialReport?: TimetableValidationReport | null;
  onValidationComplete?: (report: TimetableValidationReport) => void;
}

export function ValidationPanel({
  timetableId,
  initialReport,
  onValidationComplete,
}: ValidationPanelProps) {
  const [report, setReport] = useState<TimetableValidationReport | null>(initialReport || null);
  const [validating, setValidating] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(false);

  async function handleValidate() {
    try {
      setValidating(true);
      const res = await timetableEditService.validateTimetable(timetableId);
      setReport(res);
      if (onValidationComplete) {
        onValidationComplete(res);
      }
    } catch (err: unknown) {
      console.error("Validation failed:", err);
    } finally {
      setValidating(false);
    }
  }

  const status = report?.status || "NOT_VALIDATED";
  const errors = report?.summary?.errors || 0;
  const warnings = report?.summary?.warnings || 0;
  const issues = report?.issues || [];

  return (
    <div
      className={`rounded-2xl border transition overflow-hidden ${
        status === "VALID"
          ? "bg-emerald-950/20 border-emerald-800/40"
          : status === "INVALID"
          ? "bg-rose-950/20 border-rose-800/40"
          : "bg-slate-900/60 border-slate-800"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
        {/* Status Indicator */}
        <div className="flex items-center space-x-3">
          <div
            className={`p-2 rounded-xl border ${
              status === "VALID"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : status === "INVALID"
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {status === "VALID" ? (
              <ShieldCheck className="w-5 h-5" />
            ) : status === "INVALID" ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Timetable Invariant Validation
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  status === "VALID"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : status === "INVALID"
                    ? "bg-rose-500/20 text-rose-300"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-300 pt-0.5">
              {status === "VALID"
                ? "All hard constraints, faculty availability, and curriculum totals are 100% satisfied."
                : status === "INVALID"
                ? `${errors} critical error(s) detected. Fix conflicts or run partial repair.`
                : "Timetable has pending edits. Run validation to verify invariants."}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          {issues.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition flex items-center gap-1.5"
            >
              <span>{issues.length} Issues</span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={handleValidate}
            disabled={validating}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition shadow flex items-center gap-1.5"
          >
            {validating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Validate Now
          </button>
        </div>
      </div>

      {/* Expandable Issues Drawer */}
      {expanded && issues.length > 0 && (
        <div className="border-t border-slate-800/80 p-4 space-y-2 bg-slate-950/40">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Detected Violations & Warnings ({issues.length})
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {issues.map((iss, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  iss.severity === "ERROR"
                    ? "bg-rose-950/30 border-rose-800/40 text-rose-200"
                    : "bg-amber-950/30 border-amber-800/40 text-amber-200"
                }`}
              >
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold shrink-0 mt-0.5 bg-slate-900 border border-slate-800">
                  {iss.code}
                </span>
                <span className="leading-snug">{iss.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
