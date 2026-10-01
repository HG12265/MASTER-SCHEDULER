"use client";

import React, { useState, useEffect } from "react";
import { Plus, BookOpen, User, Building, Lock, Loader2, X } from "lucide-react";
import { facultyAllocationsService } from "@/services/facultyAllocations";
import { resourcesService } from "@/services/resources";
import { FacultyAllocation, ResourceItem, TimetableEntryType } from "@/types";
import { timetableEditService } from "@/services/timetableEditService";

interface ManualAddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  timetableId: string;
  classId: string;
  className: string;
  workingDayId: string;
  workingDayName: string;
  timeSlotId: string;
  timeSlotName: string;
  currentRevision: number;
  onAddSuccess: () => void;
}

export function ManualAddEntryModal({
  isOpen,
  onClose,
  timetableId,
  classId,
  className,
  workingDayId,
  workingDayName,
  timeSlotId,
  timeSlotName,
  currentRevision,
  onAddSuccess,
}: ManualAddEntryModalProps) {
  const [entryType, setEntryType] = useState<TimetableEntryType>("SUBJECT");
  const [allocations, setAllocations] = useState<FacultyAllocation[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [selectedAllocId, setSelectedAllocId] = useState<string>("");
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [activityTitle, setActivityTitle] = useState<string>("");
  const [lockAfterAdding, setLockAfterAdding] = useState<boolean>(false);

  const [loadingMaster, setLoadingMaster] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    async function loadAllocations() {
      if (!isOpen || !classId) return;
      try {
        setLoadingMaster(true);
        setErrorMsg("");
        const [allocData, resData] = await Promise.all([
          facultyAllocationsService.getAll({ classId }),
          resourcesService.getAll(),
        ]);
        const allocItems = allocData.data || [];
        const resItems = resData.data || [];
        setAllocations(allocItems);
        setResources(resItems);
        if (allocItems.length > 0) {
          setSelectedAllocId(allocItems[0].id);
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to load class allocations");
      } finally {
        setLoadingMaster(false);
      }
    }
    loadAllocations();
  }, [isOpen, classId]);

  if (!isOpen) return null;

  const currentAllocation = allocations.find((a) => a.id === selectedAllocId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg("");

      const payload = {
        classId,
        workingDayId,
        timeSlotId,
        entryType,
        subjectId: entryType === "SUBJECT" ? currentAllocation?.subjectId : undefined,
        facultyIds: entryType === "SUBJECT" ? currentAllocation?.facultyIds || [] : [],
        resourceId: selectedResourceId || undefined,
        title: entryType !== "SUBJECT" ? activityTitle : undefined,
        lockAfterAdding,
        expectedRevision: currentRevision,
      };

      await timetableEditService.manualAddEntry(timetableId, payload);
      onAddSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to assign period");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Assign Period</h3>
              <p className="text-xs text-slate-400">
                {className} • {workingDayName} ({timeSlotName})
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type Toggle */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setEntryType("SUBJECT")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                entryType === "SUBJECT"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Academic Subject
            </button>
            <button
              type="button"
              onClick={() => setEntryType("ACTIVITY")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                entryType !== "SUBJECT"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Fixed Activity
            </button>
          </div>

          {loadingMaster ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              Loading class allocations...
            </div>
          ) : entryType === "SUBJECT" ? (
            <>
              {/* Subject from Allocation */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Subject Allocation
                </label>
                {allocations.length === 0 ? (
                  <p className="text-xs text-amber-400/90 py-2">
                    No faculty subject allocations found for this class.
                  </p>
                ) : (
                  <select
                    value={selectedAllocId}
                    onChange={(e) => setSelectedAllocId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {allocations.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.subjectName} ({a.subjectCode}) • {a.facultyNames?.join(", ")}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Faculty Info Card */}
              {currentAllocation && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <User className="w-3.5 h-3.5 text-indigo-400" /> Assigned Faculty:
                  </div>
                  <div className="text-slate-400 pl-5">
                    {currentAllocation.facultyNames?.join(", ") || "None"}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Fixed Activity */
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Activity Title</label>
              <input
                type="text"
                value={activityTitle}
                onChange={(e) => setActivityTitle(e.target.value)}
                placeholder="e.g. Library, NET / SET Coaching, Seminar"
                required
                className="w-full bg-slate-950 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Optional Resource */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" /> Lab / Room (Optional)
            </label>
            <select
              value={selectedResourceId}
              onChange={(e) => setSelectedResourceId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Default / Standard Classroom</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>

          {/* Lock Checkbox */}
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="lockAfter"
              checked={lockAfterAdding}
              onChange={(e) => setLockAfterAdding(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
            />
            <label htmlFor="lockAfter" className="text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer">
              <Lock className="w-3.5 h-3.5 text-indigo-400" /> Lock period after adding (protect from regeneration)
            </label>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (entryType === "SUBJECT" && allocations.length === 0)}
              className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none rounded-xl transition shadow flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Assign Period
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
