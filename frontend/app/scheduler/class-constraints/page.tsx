"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  School,
  Save,
  RotateCcw,
  Calendar,
  Layers,
  Clock,
  Ban,
  CheckCircle,
  Info,
  ChevronDown,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { classConstraintsService } from "@/services/classConstraints";
import { academicYearsService } from "@/services/academicYears";
import { semesterTypesService } from "@/services/semesterTypes";
import { classesService } from "@/services/classes";
import { timeSlotsService } from "@/services/timeSlots";
import {
  AcademicYear,
  SemesterType,
  ClassEntity,
  TimeSlot,
  ClassConstraintFormData,
} from "@/types";

export default function ClassConstraintsPage() {
  const toast = useToast();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesterTypes, setSemesterTypes] = useState<SemesterType[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [teachingSlots, setTeachingSlots] = useState<TimeSlot[]>([]);

  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedSemTypeId, setSelectedSemTypeId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const [constraintId, setConstraintId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ClassConstraintFormData>({
    academicYearId: "",
    semesterTypeId: "",
    classId: "",
    maxPeriodsPerDay: 5,
    maxConsecutivePeriods: 3,
    allowFreePeriods: true,
    preferredFreeSlotIds: [],
    blockedSlotIds: [],
    notes: "",
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    async function loadMasters() {
      try {
        setLoading(true);
        const [ays, sts, cls, slots] = await Promise.all([
          academicYearsService.getAll(),
          semesterTypesService.getAll(),
          classesService.getAll({ limit: 100 }),
          timeSlotsService.getAll(),
        ]);

        setAcademicYears(ays || []);
        setSemesterTypes(sts || []);
        setClasses(cls.data || []);
        setTeachingSlots(
          (slots || [])
            .filter((s) => s.isTeachingSlot)
            .sort((a, b) => a.slotOrder - b.slotOrder)
        );

        const currentAy = ays.find((a) => a.isCurrent);
        const ayId = currentAy ? currentAy.id : ays[0]?.id || "";
        const semId = sts[0]?.id || "";
        const cId = cls.data[0]?.id || "";

        setSelectedYearId(ayId);
        setSelectedSemTypeId(semId);
        setSelectedClassId(cId);
      } catch (err: unknown) {
        toast.showToast(err instanceof Error ? err.message : "Failed to load master filters", "error");
      } finally {
        setLoading(false);
      }
    }
    loadMasters();
  }, [toast]);

  // Fetch constraint for the active class
  const fetchConstraint = useCallback(async () => {
    if (!selectedYearId || !selectedSemTypeId || !selectedClassId) return;

    try {
      setLoading(true);
      const items = await classConstraintsService.getAll({
        academicYearId: selectedYearId,
        semesterTypeId: selectedSemTypeId,
        classId: selectedClassId,
        isActive: true,
      });

      if (items && items.length > 0) {
        const found = items[0];
        setConstraintId(found.id);
        setFormData({
          academicYearId: selectedYearId,
          semesterTypeId: selectedSemTypeId,
          classId: selectedClassId,
          maxPeriodsPerDay: found.maxPeriodsPerDay ?? 5,
          maxConsecutivePeriods: found.maxConsecutivePeriods ?? 3,
          allowFreePeriods: found.allowFreePeriods ?? true,
          preferredFreeSlotIds: found.preferredFreeSlotIds || [],
          blockedSlotIds: found.blockedSlotIds || [],
          notes: found.notes || "",
        });
      } else {
        setConstraintId(null);
        setFormData({
          academicYearId: selectedYearId,
          semesterTypeId: selectedSemTypeId,
          classId: selectedClassId,
          maxPeriodsPerDay: 5,
          maxConsecutivePeriods: 3,
          allowFreePeriods: true,
          preferredFreeSlotIds: [],
          blockedSlotIds: [],
          notes: "",
        });
      }
    } catch {
      setConstraintId(null);
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, selectedSemTypeId, selectedClassId]);

  useEffect(() => {
    if (selectedYearId && selectedSemTypeId && selectedClassId) {
      fetchConstraint();
    }
  }, [fetchConstraint, selectedYearId, selectedSemTypeId, selectedClassId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYearId || !selectedSemTypeId || !selectedClassId) return;

    try {
      setSaving(true);
      const payload: ClassConstraintFormData = {
        ...formData,
        academicYearId: selectedYearId,
        semesterTypeId: selectedSemTypeId,
        classId: selectedClassId,
      };

      if (constraintId) {
        await classConstraintsService.update(constraintId, payload);
        toast.showToast("Class constraint configuration updated", "success");
      } else {
        const created = await classConstraintsService.create(payload);
        setConstraintId(created.id);
        toast.showToast("Class constraint configuration created", "success");
      }
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Failed to save constraint", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleBlockedSlot = (slotId: string) => {
    setFormData((prev) => {
      const current = prev.blockedSlotIds || [];
      const updated = current.includes(slotId)
        ? current.filter((id) => id !== slotId)
        : [...current, slotId];
      // If blocked, cannot also be preferred free
      const cleanFree = (prev.preferredFreeSlotIds || []).filter((id) => !updated.includes(id));
      return { ...prev, blockedSlotIds: updated, preferredFreeSlotIds: cleanFree };
    });
  };

  const toggleFreeSlot = (slotId: string) => {
    setFormData((prev) => {
      const current = prev.preferredFreeSlotIds || [];
      const updated = current.includes(slotId)
        ? current.filter((id) => id !== slotId)
        : [...current, slotId];
      // If preferred free, cannot also be blocked
      const cleanBlocked = (prev.blockedSlotIds || []).filter((id) => !updated.includes(id));
      return { ...prev, preferredFreeSlotIds: updated, blockedSlotIds: cleanBlocked };
    });
  };

  const activeClassObj = classes.find((c) => c.id === selectedClassId);

  return (
    <AdminLayout>
      <PageHeader
        title="Class-Specific Constraints"
        description="Override global timetable settings for specific student cohorts (max daily periods, blocked time slots, preferred free hours)."
        breadcrumbs={[{ label: "Scheduler & Constraints" }, { label: "Class Constraints" }]}
        actions={
          <button
            type="button"
            disabled={saving || !selectedClassId}
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? "Saving..." : "Save Class Rules"}
          </button>
        }
      />

      {/* Target Selector */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Academic Year</label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.isCurrent ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Semester Type</label>
            <select
              value={selectedSemTypeId}
              onChange={(e) => setSelectedSemTypeId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {semesterTypes.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Class / Section</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.displayName})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {activeClassObj && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <School className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Cohort Policy: {activeClassObj.name} ({activeClassObj.displayName})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Maximum Periods Per Day
                </label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={formData.maxPeriodsPerDay ?? 5}
                  onChange={(e) =>
                    setFormData({ ...formData, maxPeriodsPerDay: parseInt(e.target.value) || 1 })
                  }
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Daily cap on student hours.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Maximum Consecutive Periods
                </label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={formData.maxConsecutivePeriods ?? 3}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxConsecutivePeriods: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Unbroken periods before mandatory rest.</p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Allow Free Periods</div>
                  <div className="text-[10px] text-slate-500">Allow gaps between lectures for this class</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allowFreePeriods}
                  onChange={(e) =>
                    setFormData({ ...formData, allowFreePeriods: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Blocked Slots & Preferred Free Slots Picker */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Blocked Slots */}
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30">
                <div className="flex items-center gap-1.5 mb-2">
                  <Ban className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-bold text-rose-900">
                    Hard Blocked Teaching Slots
                  </span>
                </div>
                <p className="text-[11px] text-rose-700 mb-3">
                  Select periods where this class must NEVER have classes scheduled.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {teachingSlots.map((ts) => {
                    const isBlocked = (formData.blockedSlotIds || []).includes(ts.id);
                    return (
                      <button
                        type="button"
                        key={ts.id}
                        onClick={() => toggleBlockedSlot(ts.id)}
                        className={`p-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                          isBlocked
                            ? "bg-rose-600 text-white font-bold border-rose-700 shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:border-rose-300"
                        }`}
                      >
                        <div className="font-semibold">{ts.name}</div>
                        <div
                          className={`text-[10px] ${
                            isBlocked ? "text-rose-100" : "text-slate-400"
                          }`}
                        >
                          {ts.startTime} - {ts.endTime}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preferred Free Slots */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30">
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-900">
                    Preferred Free / Study Slots
                  </span>
                </div>
                <p className="text-[11px] text-indigo-700 mb-3">
                  Soft preference: The engine will prioritize keeping these hours free for self-study.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {teachingSlots.map((ts) => {
                    const isFree = (formData.preferredFreeSlotIds || []).includes(ts.id);
                    return (
                      <button
                        type="button"
                        key={ts.id}
                        onClick={() => toggleFreeSlot(ts.id)}
                        className={`p-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                          isFree
                            ? "bg-indigo-600 text-white font-bold border-indigo-700 shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                        }`}
                      >
                        <div className="font-semibold">{ts.name}</div>
                        <div
                          className={`text-[10px] ${
                            isFree ? "text-indigo-100" : "text-slate-400"
                          }`}
                        >
                          {ts.startTime} - {ts.endTime}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Internal Constraints Notes
              </label>
              <textarea
                rows={2}
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g. Reserved for project reviews or student placement training."
                className="w-full text-xs p-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </form>
      )}
    </AdminLayout>
  );
}
