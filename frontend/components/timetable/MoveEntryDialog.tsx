"use client";

import React, { useState } from "react";
import { ArrowRight, Calendar, Clock, Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { TimetableEntry } from "@/types";
import { MovePreviewResponse } from "@/types/timetableEdit";
import { timetableEditService } from "@/services/timetableEditService";

interface MoveEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  timetableId: string;
  entry: TimetableEntry | null;
  workingDays: { id: string; name: string }[];
  timeSlots: { id: string; name: string; isBreak?: boolean; isLunch?: boolean }[];
  currentRevision: number;
  onMoveSuccess: () => void;
}

export function MoveEntryDialog({
  isOpen,
  onClose,
  timetableId,
  entry,
  workingDays,
  timeSlots,
  currentRevision,
  onMoveSuccess,
}: MoveEntryDialogProps) {
  const [targetDayId, setTargetDayId] = useState<string>(workingDays[0]?.id || "");
  const [targetSlotId, setTargetSlotId] = useState<string>(timeSlots[0]?.id || "");
  const [checking, setChecking] = useState<boolean>(false);
  const [applying, setApplying] = useState<boolean>(false);
  const [previewResult, setPreviewResult] = useState<MovePreviewResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  if (!isOpen || !entry) return null;

  const teachingSlots = timeSlots.filter((s) => !s.isBreak && !s.isLunch);

  async function handleCheck() {
    if (!targetDayId || !targetSlotId) return;
    try {
      setChecking(true);
      setErrorMsg("");
      const result = await timetableEditService.previewMove(timetableId, {
        entryId: entry!.id,
        targetWorkingDayId: targetDayId,
        targetTimeSlotId: targetSlotId,
      });
      setPreviewResult(result);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to preview move");
    } finally {
      setChecking(false);
    }
  }

  async function handleApply() {
    if (!previewResult?.valid) return;
    try {
      setApplying(true);
      setErrorMsg("");
      await timetableEditService.applyMove(timetableId, entry!.id, {
        targetWorkingDayId: targetDayId,
        targetTimeSlotId: targetSlotId,
        expectedRevision: currentRevision,
      });
      onMoveSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to apply move");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Move Period</h3>
              <p className="text-xs text-slate-400">
                Move &apos;{entry.subjectName || entry.title}&apos; to another slot
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

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Target Working Day
            </label>
            <select
              value={targetDayId}
              onChange={(e) => {
                setTargetDayId(e.target.value);
                setPreviewResult(null);
              }}
              className="w-full bg-slate-950 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {workingDays.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" /> Target Starting Slot
            </label>
            <select
              value={targetSlotId}
              onChange={(e) => {
                setTargetSlotId(e.target.value);
                setPreviewResult(null);
              }}
              className="w-full bg-slate-950 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {teachingSlots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Validation Feedback */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {previewResult && (
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
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-800/20">
          <button
            onClick={handleCheck}
            disabled={checking || applying}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5"
          >
            {checking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Check Move
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!previewResult?.valid || applying}
              className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none rounded-xl transition shadow flex items-center gap-1.5"
            >
              {applying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Apply Move
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
