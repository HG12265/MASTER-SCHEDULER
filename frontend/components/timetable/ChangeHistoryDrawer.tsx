"use client";

import React, { useState, useEffect } from "react";
import { History, RotateCcw, X, Clock, Loader2, CheckCircle2, Shield } from "lucide-react";
import { TimetableChangeHistory } from "@/types/timetableEdit";
import { timetableEditService } from "@/services/timetableEditService";

interface ChangeHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  timetableId: string;
  currentRevision: number;
  onHistoryActionSuccess: () => void;
}

export function ChangeHistoryDrawer({
  isOpen,
  onClose,
  timetableId,
  currentRevision,
  onHistoryActionSuccess,
}: ChangeHistoryDrawerProps) {
  const [history, setHistory] = useState<TimetableChangeHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    async function loadHistory() {
      if (!isOpen || !timetableId) return;
      try {
        setLoading(true);
        setErrorMsg("");
        const data = await timetableEditService.getHistory(timetableId);
        setHistory(data);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [isOpen, timetableId]);

  if (!isOpen) return null;

  async function handleUndo(record: TimetableChangeHistory) {
    try {
      setUndoingId(record.id);
      setErrorMsg("");
      await timetableEditService.undoChange(timetableId, record.id, currentRevision);
      // Reload history
      const freshHistory = await timetableEditService.getHistory(timetableId);
      setHistory(freshHistory);
      onHistoryActionSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to undo change");
    } finally {
      setUndoingId(null);
    }
  }

  function formatTime(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return iso;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Change History</h3>
              <p className="text-xs text-slate-400">
                Audit trail & atomic undo actions
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

        {/* Error message */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* List of changes */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              Loading change history...
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No manual edits or changes recorded yet for this timetable version.
            </div>
          ) : (
            history.map((h) => {
              const isUndoAction = h.changeType.startsWith("UNDO");
              return (
                <div
                  key={h.id}
                  className={`p-3.5 rounded-xl border text-xs space-y-2 transition ${
                    h.reverted
                      ? "bg-slate-950/40 border-slate-800/60 opacity-60"
                      : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-800 text-slate-300">
                      Rev #{h.revision} • {h.changeType}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(h.performedAt)}
                    </span>
                  </div>

                  <p className="text-slate-200 leading-relaxed">{h.description}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                    <span className="text-[10px] text-slate-500">
                      {h.performedBy ? `By: ${h.performedBy}` : "System Admin"}
                    </span>

                    {h.reverted ? (
                      <span className="text-[10px] text-slate-500 italic">
                        Reverted
                      </span>
                    ) : isUndoAction ? (
                      <span className="text-[10px] text-indigo-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Rollback Record
                      </span>
                    ) : (
                      <button
                        onClick={() => handleUndo(h)}
                        disabled={undoingId === h.id}
                        className="px-2.5 py-1 text-[11px] font-medium text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/50 rounded-lg transition flex items-center gap-1.5"
                      >
                        {undoingId === h.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        Undo
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 text-[11px] text-slate-500 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          <span>Snapshots safely preserved in MongoDB audit collection</span>
        </div>
      </div>
    </div>
  );
}
