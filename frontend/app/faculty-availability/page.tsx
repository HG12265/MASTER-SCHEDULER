"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CalendarCheck,
  Check,
  X,
  Star,
  AlertTriangle,
  Save,
  RotateCcw,
  Copy,
  ChevronDown,
  Info,
  Calendar,
  Layers,
  Users,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { Modal } from "@/components/Modal";
import { academicYearsService } from "@/services/academicYears";
import { semesterTypesService } from "@/services/semesterTypes";
import { facultyService } from "@/services/faculty";
import { workingDaysService } from "@/services/workingDays";
import { timeSlotsService } from "@/services/timeSlots";
import { facultyAvailabilityService } from "@/services/facultyAvailability";
import {
  AcademicYear,
  SemesterType,
  Faculty,
  WorkingDay,
  TimeSlot,
  AvailabilityStatus,
  FacultyAvailabilityBulkEntry,
} from "@/types";

const STATUS_CONFIG: Record<
  AvailabilityStatus,
  { label: string; icon: React.ElementType; bg: string; text: string; border: string; desc: string }
> = {
  AVAILABLE: {
    label: "Available",
    icon: Check,
    bg: "bg-emerald-50 hover:bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-200",
    desc: "Faculty is fully available for teaching.",
  },
  UNAVAILABLE: {
    label: "Unavailable",
    icon: X,
    bg: "bg-rose-50 hover:bg-rose-100",
    text: "text-rose-700",
    border: "border-rose-200",
    desc: "Hard constraint: Must NEVER be scheduled.",
  },
  PREFERRED: {
    label: "Preferred",
    icon: Star,
    bg: "bg-indigo-50 hover:bg-indigo-100",
    text: "text-indigo-700",
    border: "border-indigo-200",
    desc: "Soft preference: Engine prefers this slot.",
  },
  AVOID: {
    label: "Avoid",
    icon: AlertTriangle,
    bg: "bg-amber-50 hover:bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-200",
    desc: "Soft preference: Avoid if feasible.",
  },
};

const STATUS_CYCLE: AvailabilityStatus[] = ["AVAILABLE", "UNAVAILABLE", "PREFERRED", "AVOID"];

export default function FacultyAvailabilityPage() {
  const toast = useToast();

  // Master Data
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesterTypes, setSemesterTypes] = useState<SemesterType[]>([]);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);
  const [teachingSlots, setTeachingSlots] = useState<TimeSlot[]>([]);

  // Selection states
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedSemTypeId, setSelectedSemTypeId] = useState<string>("");
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");

  // Grid state: key = `${workingDayId}_${timeSlotId}` -> AvailabilityStatus
  const [gridState, setGridState] = useState<Record<string, AvailabilityStatus>>({});
  const [initialGridState, setInitialGridState] = useState<Record<string, AvailabilityStatus>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Copy modal state
  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);
  const [copySourceFacultyId, setCopySourceFacultyId] = useState<string>("");
  const [copying, setCopying] = useState<boolean>(false);

  // Load masters on mount
  useEffect(() => {
    async function loadMasterData() {
      try {
        setLoading(true);
        const [ays, sts, facs, days, slots] = await Promise.all([
          academicYearsService.getAll(),
          semesterTypesService.getAll(),
          facultyService.getAll({ limit: 100, isActive: true }),
          workingDaysService.getAll(),
          timeSlotsService.getAll(),
        ]);

        setAcademicYears(ays || []);
        setSemesterTypes(sts || []);
        setFacultyList(facs.data || []);

        const sortedDays = (days || [])
          .filter((d) => d.isWorkingDay)
          .sort((a, b) => a.dayOrder - b.dayOrder);
        setWorkingDays(sortedDays);

        const sortedSlots = (slots || [])
          .filter((s) => s.isTeachingSlot)
          .sort((a, b) => a.slotOrder - b.slotOrder);
        setTeachingSlots(sortedSlots);

        // Pre-select current AY if available
        const currentAy = ays.find((a) => a.isCurrent);
        if (currentAy) setSelectedYearId(currentAy.id);
        else if (ays.length > 0) setSelectedYearId(ays[0].id);

        if (sts.length > 0) setSelectedSemTypeId(sts[0].id);
        if (facs.data.length > 0) setSelectedFacultyId(facs.data[0].id);
      } catch (err: unknown) {
        toast.showToast(err instanceof Error ? err.message : "Failed to load master filters", "error");
      } finally {
        setLoading(false);
      }
    }
    loadMasterData();
  }, [toast]);

  // Fetch availability when selection changes
  const fetchAvailability = useCallback(async () => {
    if (!selectedYearId || !selectedSemTypeId || !selectedFacultyId) return;

    try {
      setLoading(true);
      const records = await facultyAvailabilityService.getAll({
        academicYearId: selectedYearId,
        semesterTypeId: selectedSemTypeId,
        facultyId: selectedFacultyId,
        isActive: true,
      });

      const nextGrid: Record<string, AvailabilityStatus> = {};
      // Default all to AVAILABLE
      workingDays.forEach((day) => {
        teachingSlots.forEach((slot) => {
          nextGrid[`${day.id}_${slot.id}`] = "AVAILABLE";
        });
      });

      // Apply exceptions from DB
      records.forEach((rec) => {
        const key = `${rec.workingDayId}_${rec.timeSlotId}`;
        nextGrid[key] = rec.availabilityStatus;
      });

      setGridState(nextGrid);
      setInitialGridState(nextGrid);
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Failed to load faculty availability", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, selectedSemTypeId, selectedFacultyId, workingDays, teachingSlots, toast]);

  useEffect(() => {
    if (selectedYearId && selectedSemTypeId && selectedFacultyId && workingDays.length > 0) {
      fetchAvailability();
    }
  }, [fetchAvailability, selectedYearId, selectedSemTypeId, selectedFacultyId, workingDays.length]);

  // Is dirty
  const isDirty = useMemo(() => {
    const keys = Object.keys(gridState);
    for (const key of keys) {
      if (gridState[key] !== initialGridState[key]) return true;
    }
    return false;
  }, [gridState, initialGridState]);

  // Cycle status on cell click
  const handleCellClick = (dayId: string, slotId: string) => {
    const key = `${dayId}_${slotId}`;
    const current = gridState[key] || "AVAILABLE";
    const nextIdx = (STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length;
    const nextStatus = STATUS_CYCLE[nextIdx];

    setGridState((prev) => ({
      ...prev,
      [key]: nextStatus,
    }));
  };

  // Quick action: Full day
  const handleMarkFullDay = (dayId: string, status: AvailabilityStatus) => {
    setGridState((prev) => {
      const copy = { ...prev };
      teachingSlots.forEach((slot) => {
        copy[`${dayId}_${slot.id}`] = status;
      });
      return copy;
    });
  };

  // Quick action: All slots
  const handleMarkAll = (status: AvailabilityStatus) => {
    setGridState((prev) => {
      const copy = { ...prev };
      workingDays.forEach((day) => {
        teachingSlots.forEach((slot) => {
          copy[`${day.id}_${slot.id}`] = status;
        });
      });
      return copy;
    });
  };

  // Quick action: Clear preferences (reset PREFERRED / AVOID back to AVAILABLE, preserve UNAVAILABLE)
  const handleClearPreferences = () => {
    setGridState((prev) => {
      const copy = { ...prev };
      Object.keys(copy).forEach((k) => {
        if (copy[k] === "PREFERRED" || copy[k] === "AVOID") {
          copy[k] = "AVAILABLE";
        }
      });
      return copy;
    });
  };

  // Save changes
  const handleSave = async () => {
    if (!selectedYearId || !selectedSemTypeId || !selectedFacultyId) return;

    try {
      setSaving(true);
      const entries: FacultyAvailabilityBulkEntry[] = [];

      workingDays.forEach((day) => {
        teachingSlots.forEach((slot) => {
          const key = `${day.id}_${slot.id}`;
          const currentStatus = gridState[key] || "AVAILABLE";
          const initialStatus = initialGridState[key] || "AVAILABLE";

          // If it was changed, or if it's currently an exception, include in bulk update
          if (currentStatus !== initialStatus || currentStatus !== "AVAILABLE") {
            entries.push({
              workingDayId: day.id,
              timeSlotId: slot.id,
              availabilityStatus: currentStatus,
            });
          }
        });
      });

      await facultyAvailabilityService.bulkUpdate({
        academicYearId: selectedYearId,
        semesterTypeId: selectedSemTypeId,
        facultyId: selectedFacultyId,
        entries,
      });

      setInitialGridState({ ...gridState });
      toast.showToast("Weekly availability saved successfully", "success");
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Failed to save availability", "error");
    } finally {
      setSaving(false);
    }
  };

  // Copy availability from another faculty
  const handleCopyAvailability = async () => {
    if (!copySourceFacultyId || !selectedYearId || !selectedSemTypeId) return;

    try {
      setCopying(true);
      const sourceRecords = await facultyAvailabilityService.getAll({
        academicYearId: selectedYearId,
        semesterTypeId: selectedSemTypeId,
        facultyId: copySourceFacultyId,
        isActive: true,
      });

      const nextGrid: Record<string, AvailabilityStatus> = {};
      workingDays.forEach((day) => {
        teachingSlots.forEach((slot) => {
          nextGrid[`${day.id}_${slot.id}`] = "AVAILABLE";
        });
      });

      sourceRecords.forEach((rec) => {
        const key = `${rec.workingDayId}_${rec.timeSlotId}`;
        nextGrid[key] = rec.availabilityStatus;
      });

      setGridState(nextGrid);
      setIsCopyModalOpen(false);
      toast.showToast("Pattern copied from selected faculty! Click 'Save Changes' to commit.", "info");
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Failed to copy availability", "error");
    } finally {
      setCopying(false);
    }
  };

  const selectedFacultyObj = facultyList.find((f) => f.id === selectedFacultyId);

  return (
    <AdminLayout>
      <PageHeader
        title="Faculty Availability Matrix"
        description="Configure individual teaching slots, hard unavailability rules, and soft preferences on an interactive weekly grid."
        breadcrumbs={[
          { label: "Scheduler & Constraints" },
          { label: "Faculty Availability" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCopyModalOpen(true)}
              className="inline-flex items-center px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Copy Pattern
            </button>
            <button
              type="button"
              disabled={!isDirty || saving}
              onClick={handleSave}
              className={`inline-flex items-center px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors ${
                isDirty
                  ? "bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                  : "bg-slate-300 cursor-not-allowed"
              }`}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        }
      />

      {/* Selector Filters Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Academic Year
              </span>
            </label>
            <div className="relative">
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="w-full text-xs py-2 pl-3 pr-8 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 appearance-none"
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name} {ay.isCurrent ? " (Current)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                Semester Type
              </span>
            </label>
            <div className="relative">
              <select
                value={selectedSemTypeId}
                onChange={(e) => setSelectedSemTypeId(e.target.value)}
                className="w-full text-xs py-2 pl-3 pr-8 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 appearance-none"
              >
                {semesterTypes.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                Faculty Member
              </span>
            </label>
            <div className="relative">
              <select
                value={selectedFacultyId}
                onChange={(e) => setSelectedFacultyId(e.target.value)}
                className="w-full text-xs py-2 pl-3 pr-8 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 appearance-none"
              >
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.facultyCode}) — {f.designation || "Faculty"}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid Legend & Quick Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
          <span className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
            Cell Legend (Click to Cycle):
          </span>
          {STATUS_CYCLE.map((st) => {
            const conf = STATUS_CONFIG[st];
            const Icon = conf.icon;
            return (
              <div key={st} className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-md border ${conf.border} ${conf.bg} ${conf.text}`}
                >
                  <Icon className="w-3 h-3" />
                </span>
                <span className="text-slate-800">{conf.label}</span>
              </div>
            );
          })}
        </div>

        {/* Quick Batch Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleMarkAll("AVAILABLE")}
            className="px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
          >
            Mark All Available
          </button>
          <button
            type="button"
            onClick={() => handleMarkAll("UNAVAILABLE")}
            className="px-2.5 py-1 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
          >
            Mark All Unavailable
          </button>
          <button
            type="button"
            onClick={handleClearPreferences}
            className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors"
          >
            <RotateCcw className="w-3 h-3 inline mr-1 text-slate-400" />
            Clear Preferences
          </button>
        </div>
      </div>

      {/* Active Faculty Workload Stats Notice */}
      {selectedFacultyObj && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50/60 border border-indigo-100 rounded-lg mb-4 text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>{selectedFacultyObj.name}</strong> ({selectedFacultyObj.facultyCode}) | Max Workload:{" "}
              <strong>{selectedFacultyObj.maxHoursPerWeek} hrs/week</strong> | Max Daily:{" "}
              <strong>{selectedFacultyObj.maxHoursPerDay} hrs/day</strong>
            </span>
          </div>
          {isDirty && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
              Unsaved Changes
            </span>
          )}
        </div>
      )}

      {/* Timetable Weekly Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-4 w-40 min-w-40 border-r border-slate-200">
                  Day / Period
                </th>
                {teachingSlots.map((slot) => (
                  <th
                    key={slot.id}
                    className="py-3 px-3 text-center border-r border-slate-200 last:border-r-0 min-w-28"
                  >
                    <div>{slot.name}</div>
                    <div className="text-[10px] text-slate-500 font-normal font-mono mt-0.5">
                      {slot.startTime} - {slot.endTime}
                    </div>
                  </th>
                ))}
                <th className="py-3 px-3 text-center w-28 text-[10px] text-slate-500">
                  Row Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td
                    colSpan={teachingSlots.length + 2}
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    Loading weekly matrix...
                  </td>
                </tr>
              ) : workingDays.length === 0 || teachingSlots.length === 0 ? (
                <tr>
                  <td
                    colSpan={teachingSlots.length + 2}
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    No active working days or teaching periods configured.
                  </td>
                </tr>
              ) : (
                workingDays.map((day) => (
                  <tr key={day.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Day Header Column */}
                    <td className="py-3 px-4 font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/40">
                      <div>{day.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{day.shortName}</div>
                    </td>

                    {/* Slots Cells */}
                    {teachingSlots.map((slot) => {
                      const key = `${day.id}_${slot.id}`;
                      const status = gridState[key] || "AVAILABLE";
                      const config = STATUS_CONFIG[status];
                      const Icon = config.icon;

                      return (
                        <td
                          key={slot.id}
                          className="p-1.5 border-r border-slate-200 last:border-r-0 text-center"
                        >
                          <button
                            type="button"
                            onClick={() => handleCellClick(day.id, slot.id)}
                            title={`${day.name} ${slot.name}: ${config.label} - ${config.desc}`}
                            className={`w-full py-2.5 px-2 rounded-lg border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer select-none ${config.bg} ${config.border} ${config.text} shadow-2xs hover:scale-[1.02] active:scale-95`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-tight">
                              {config.label}
                            </span>
                          </button>
                        </td>
                      );
                    })}

                    {/* Row Quick Action */}
                    <td className="p-2 text-center">
                      <div className="flex flex-col gap-1 items-center">
                        <button
                          type="button"
                          onClick={() => handleMarkFullDay(day.id, "AVAILABLE")}
                          className="text-[10px] px-2 py-0.5 rounded text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 w-full"
                          title="Mark all slots on this day as Available"
                        >
                          All Free
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkFullDay(day.id, "UNAVAILABLE")}
                          className="text-[10px] px-2 py-0.5 rounded text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 w-full"
                          title="Mark all slots on this day as Unavailable"
                        >
                          Off Day
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Copy Pattern Modal */}
      <Modal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        title="Copy Availability Template"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Select another faculty member within the current Academic Year and Term to copy their
            complete availability schedule.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Source Faculty Member
            </label>
            <select
              value={copySourceFacultyId}
              onChange={(e) => setCopySourceFacultyId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose Faculty to Copy From --</option>
              {facultyList
                .filter((f) => f.id !== selectedFacultyId)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.facultyCode}) — {f.designation || "Faculty"}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCopyModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!copySourceFacultyId || copying}
              onClick={handleCopyAvailability}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300"
            >
              {copying ? "Copying..." : "Apply Template"}
            </button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
