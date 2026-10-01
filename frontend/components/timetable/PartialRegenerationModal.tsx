"use client";

import React, { useState } from "react";
import { Sparkles, ArrowRight, Loader2, CheckCircle2, AlertTriangle, X, Shield, RefreshCw } from "lucide-react";
import { RegenerationPreviewResponse } from "@/types/timetableEdit";
import { timetableEditService } from "@/services/timetableEditService";

interface PartialRegenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  timetableId: string;
  classes: { id: string; name: string }[];
  workingDays: { id: string; name: string }[];
  currentRevision: number;
  onApplySuccess: () => void;
}

export function PartialRegenerationModal({
  isOpen,
  onClose,
  timetableId,
  classes,
  workingDays,
  currentRevision,
  onApplySuccess,
}: PartialRegenerationModalProps) {
  // Scope State
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(classes[0] ? [classes[0].id] : []);
  const [selectedDayIds, setSelectedDayIds] = useState<string[]>([]);
  const [preserveLocked, setPreserveLocked] = useState<boolean>(true);
  const [maxSolveSeconds, setMaxSolveSeconds] = useState<number>(15);

  // Preview & Apply State
  const [previewing, setPreviewing] = useState<boolean>(false);
  const [applying, setApplying] = useState<boolean>(false);
  const [preview, setPreview] = useState<RegenerationPreviewResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  if (!isOpen) return null;

  function toggleClass(id: string) {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
    setPreview(null);
  }

  function toggleDay(id: string) {
    setSelectedDayIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
    setPreview(null);
  }

  async function handlePreview() {
    try {
      setPreviewing(true);
      setErrorMsg("");
      const res = await timetableEditService.previewRegeneration(timetableId, {
        scope: {
          classIds: selectedClassIds,
          workingDayIds: selectedDayIds,
        },
        preserveLockedEntries: preserveLocked,
        solverOptions: {
          maxSolveSeconds,
          numSearchWorkers: 4,
        },
      });
      setPreview(res);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Partial regeneration failed");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleApply() {
    if (!preview?.previewToken) return;
    try {
      setApplying(true);
      setErrorMsg("");
      await timetableEditService.applyRegeneration(timetableId, {
        previewToken: preview.previewToken,
        expectedRevision: currentRevision,
      });
      onApplySuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to apply regeneration");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Partial Timetable Regeneration</h3>
              <p className="text-xs text-slate-400">
                Re-solve specific classes and days using Google OR-Tools CP-SAT
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

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Scope Selection */}
          <div className="space-y-4">
            {/* Target Classes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                1. Select Classes to Re-Optimize (Unselected classes remain frozen)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {classes.map((cls) => {
                  const isChecked = selectedClassIds.includes(cls.id);
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => toggleClass(cls.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition ${
                        isChecked
                          ? "bg-indigo-950/40 border-indigo-500 text-white"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <span>{cls.name}</span>
                      {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Days */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                2. Select Specific Days (Optional, leave blank to include all days)
              </label>
              <div className="flex flex-wrap gap-2">
                {workingDays.map((d) => {
                  const isChecked = selectedDayIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDay(d.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                        isChecked
                          ? "bg-indigo-950/40 border-indigo-500 text-white"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {d.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Constraints & Options */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="preserveLocked"
                    checked={preserveLocked}
                    onChange={(e) => {
                      setPreserveLocked(e.target.checked);
                      setPreview(null);
                    }}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                  />
                  <label htmlFor="preserveLocked" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Preserve manually locked & system fixed periods
                  </label>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                  <span>Solve time:</span>
                  <select
                    value={maxSolveSeconds}
                    onChange={(e) => setMaxSolveSeconds(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                  >
                    <option value={10}>10s</option>
                    <option value={15}>15s</option>
                    <option value={30}>30s</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          {!preview && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewing || selectedClassIds.length === 0}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition shadow flex items-center justify-center gap-2 mx-auto"
              >
                {previewing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    CP-SAT Solver Optimizing Scope...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Generate Regeneration Preview
                  </>
                )}
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Diff Preview Table */}
          {preview && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  Proposed Changes ({preview.movedEntries.length} periods moved)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800 text-indigo-300 font-semibold">
                  STATUS: {preview.solverStatus}
                </span>
              </div>

              {preview.movedEntries.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                  No periods need to move; selected scope is already optimal.
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase tracking-wider font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Subject / Class</th>
                        <th className="py-2 px-3">Original Position</th>
                        <th className="py-2 px-1 text-center"></th>
                        <th className="py-2 px-3">Optimized Position</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                      {preview.movedEntries.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-medium text-white truncate max-w-[140px]">
                            {m.subjectName}
                            <span className="block text-[10px] text-slate-500">{m.className}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-400">
                            {m.fromDayName} • {m.fromTimeSlotName}
                          </td>
                          <td className="py-2 px-1 text-center text-indigo-400">
                            <ArrowRight className="w-3.5 h-3.5 inline" />
                          </td>
                          <td className="py-2 px-3 text-emerald-400 font-medium">
                            {m.toDayName} • {m.toTimeSlotName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-800/20">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Out-of-scope periods strictly frozen in place</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            {preview && preview.success && (
              <button
                onClick={handleApply}
                disabled={applying}
                className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition shadow flex items-center gap-1.5"
              >
                {applying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Apply Changes to Timetable
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
