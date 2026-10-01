"use client";

import React, { useState } from "react";
import { Trash2, AlertTriangle, Loader2, X, AlertCircle } from "lucide-react";
import { TimetableEntry } from "@/types";
import { timetableEditService } from "@/services/timetableEditService";

interface RemoveConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  timetableId: string;
  entry: TimetableEntry | null;
  currentRevision: number;
  onRemoveSuccess: () => void;
}

export function RemoveConfirmModal({
  isOpen,
  onClose,
  timetableId,
  entry,
  currentRevision,
  onRemoveSuccess,
}: RemoveConfirmModalProps) {
  const [removing, setRemoving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  if (!isOpen || !entry) return null;

  const isFixed = entry.isFixed;
  const isBlock = (entry.blockSize || 1) > 1;

  async function handleConfirm() {
    try {
      setRemoving(true);
      setErrorMsg("");
      await timetableEditService.removeEntry(timetableId, entry!.id, currentRevision);
      onRemoveSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to remove entry");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Remove Period</h3>
              <p className="text-xs text-slate-400">
                {entry.subjectName || entry.title}
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
        <div className="p-6 space-y-4">
          {isFixed ? (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-300">System Fixed Period</p>
                <p className="text-amber-200/90 pt-1">
                  This slot is system-fixed by academic policy. To remove it, update the master Fixed Slots configuration.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-rose-200 text-xs leading-relaxed space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Curriculum Shortage Warning</span>
              </div>
              <p>
                Removing this period will cause a weekly requirement shortage for{" "}
                <span className="font-semibold text-white">{entry.subjectName || entry.title}</span>.
                {isBlock && ` This is part of a ${entry.blockSize}-period block; all block periods will be removed.`}
              </p>
              <p className="text-[11px] text-rose-300/80 pt-1">
                The timetable validation status will update to <span className="font-mono font-bold text-rose-200">INVALID / NEEDS REPAIR</span> until replaced or partially regenerated.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs">
              {errorMsg}
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
          {!isFixed && (
            <button
              onClick={handleConfirm}
              disabled={removing}
              className="px-4 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-xl transition shadow flex items-center gap-1.5"
            >
              {removing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Remove & Mark for Repair
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
