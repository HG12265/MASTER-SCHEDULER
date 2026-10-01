"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeftRight, Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { TimetableEntry } from "@/types";
import { SwapPreviewResponse } from "@/types/timetableEdit";
import { timetableEditService } from "@/services/timetableEditService";

interface SwapConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  timetableId: string;
  firstEntry: TimetableEntry | null;
  secondEntry: TimetableEntry | null;
  currentRevision: number;
  onSwapSuccess: () => void;
}

export function SwapConfirmDialog({
  isOpen,
  onClose,
  timetableId,
  firstEntry,
  secondEntry,
  currentRevision,
  onSwapSuccess,
}: SwapConfirmDialogProps) {
  const [checking, setChecking] = useState<boolean>(true);
  const [applying, setApplying] = useState<boolean>(false);
  const [previewResult, setPreviewResult] = useState<SwapPreviewResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    async function checkSwap() {
      if (!isOpen || !firstEntry || !secondEntry) return;
      try {
        setChecking(true);
        setErrorMsg("");
        const result = await timetableEditService.previewSwap(timetableId, {
          firstEntryId: firstEntry.id,
          secondEntryId: secondEntry.id,
        });
        setPreviewResult(result);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to preview swap");
      } finally {
        setChecking(false);
      }
    }
    checkSwap();
  }, [isOpen, timetableId, firstEntry, secondEntry]);

  if (!isOpen || !firstEntry || !secondEntry) return null;

  async function handleApply() {
    if (!previewResult?.valid) return;
    try {
      setApplying(true);
      setErrorMsg("");
      await timetableEditService.applySwap(timetableId, {
        firstEntryId: firstEntry!.id,
        secondEntryId: secondEntry!.id,
        expectedRevision: currentRevision,
      });
      onSwapSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to apply swap");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Confirm Period Swap</h3>
              <p className="text-xs text-slate-400">Atomic swap between two scheduled periods</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Swap Visual Diff */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 items-center">
            {/* Period A */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Period A
              </div>
              <div className="text-xs font-medium text-white truncate">
                {firstEntry.subjectName || firstEntry.title}
              </div>
              <div className="text-[11px] text-slate-400">
                {firstEntry.dayName} • {firstEntry.timeSlotName}
              </div>
              {firstEntry.facultyNames && firstEntry.facultyNames.length > 0 && (
                <div className="text-[10px] text-indigo-400 truncate">
                  {firstEntry.facultyNames.join(", ")}
                </div>
              )}
            </div>

            {/* Period B */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Period B
              </div>
              <div className="text-xs font-medium text-white truncate">
                {secondEntry.subjectName || secondEntry.title}
              </div>
              <div className="text-[11px] text-slate-400">
                {secondEntry.dayName} • {secondEntry.timeSlotName}
              </div>
              {secondEntry.facultyNames && secondEntry.facultyNames.length > 0 && (
                <div className="text-[10px] text-violet-400 truncate">
                  {secondEntry.facultyNames.join(", ")}
                </div>
              )}
            </div>
          </div>

          {/* Validation Feedback */}
          {checking && (
            <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
              Validating conflict invariants across both positions...
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {previewResult && !checking && (
            <div
              className={`p-3.5 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
                previewResult.valid
                  ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-200"
                  : "bg-rose-950/30 border-rose-800/40 text-rose-200"
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                {previewResult.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
                <span>{previewResult.message}</span>
              </div>
              {previewResult.conflicts.map((c, i) => (
                <p key={i} className="text-[11px] text-rose-300/90 pl-5">
                  • {c.message}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-800 bg-slate-800/20 space-x-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!previewResult?.valid || applying || checking}
            className="px-4 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:pointer-events-none rounded-xl transition shadow flex items-center gap-1.5"
          >
            {applying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Confirm & Swap
          </button>
        </div>
      </div>
    </div>
  );
}
