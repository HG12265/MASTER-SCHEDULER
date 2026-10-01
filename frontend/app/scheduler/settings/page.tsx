"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sliders,
  Save,
  RotateCcw,
  Calendar,
  Layers,
  Users,
  School,
  BookOpen,
  Scale,
  Clock,
  Zap,
  Info,
  CheckCircle2,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { schedulingSettingsService } from "@/services/schedulingSettings";
import { academicYearsService } from "@/services/academicYears";
import { semesterTypesService } from "@/services/semesterTypes";
import {
  AcademicYear,
  SemesterType,
  SchedulingSettings,
  SchedulingSettingsFormData,
  SoftConstraintWeights,
} from "@/types";

const DEFAULT_WEIGHTS: SoftConstraintWeights = {
  subjectDistribution: 8,
  facultyLoadBalance: 7,
  avoidConsecutiveHours: 6,
  preferredAvailability: 8,
  avoidAvailability: 5,
  avoidLastPeriod: 3,
  avoidFirstPeriod: 2,
  labBlockContinuity: 9,
};

const DEFAULT_SETTINGS: SchedulingSettingsFormData = {
  maxFacultyHoursPerDay: 4,
  maxFacultyConsecutiveHours: 2,
  maxClassConsecutiveHours: 3,
  avoidSameSubjectMultipleTimesPerDay: true,
  distributeSubjectsAcrossWeek: true,
  balanceFacultyDailyLoad: true,
  preferLabsInBlocks: true,
  avoidFirstPeriodForFaculty: false,
  avoidLastPeriodForFaculty: false,
  allowFreePeriodsForClasses: true,
  allowUnassignedSlots: false,
  softConstraintWeights: DEFAULT_WEIGHTS,
};

export default function SchedulingSettingsPage() {
  const toast = useToast();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesterTypes, setSemesterTypes] = useState<SemesterType[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedSemTypeId, setSelectedSemTypeId] = useState<string>("");

  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SchedulingSettingsFormData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Load masters on mount
  useEffect(() => {
    async function loadMasters() {
      try {
        setLoading(true);
        const [ays, sts] = await Promise.all([
          academicYearsService.getAll(),
          semesterTypesService.getAll(),
        ]);
        setAcademicYears(ays || []);
        setSemesterTypes(sts || []);

        const currentAy = ays.find((a) => a.isCurrent);
        const ayId = currentAy ? currentAy.id : ays[0]?.id || "";
        const semId = sts[0]?.id || "";

        setSelectedYearId(ayId);
        setSelectedSemTypeId(semId);
      } catch (err: unknown) {
        toast.showToast(err instanceof Error ? err.message : "Failed to load academic terms", "error");
      } finally {
        setLoading(false);
      }
    }
    loadMasters();
  }, [toast]);

  // Fetch settings for active term
  const fetchSettings = useCallback(async () => {
    if (!selectedYearId || !selectedSemTypeId) return;

    try {
      setLoading(true);
      const data = await schedulingSettingsService.getCurrent(selectedYearId, selectedSemTypeId);
      if (data) {
        setSettingsId(data.id);
        setFormData({
          academicYearId: selectedYearId,
          semesterTypeId: selectedSemTypeId,
          maxFacultyHoursPerDay: data.maxFacultyHoursPerDay ?? 4,
          maxFacultyConsecutiveHours: data.maxFacultyConsecutiveHours ?? 2,
          maxClassConsecutiveHours: data.maxClassConsecutiveHours ?? 3,
          avoidSameSubjectMultipleTimesPerDay: data.avoidSameSubjectMultipleTimesPerDay ?? true,
          distributeSubjectsAcrossWeek: data.distributeSubjectsAcrossWeek ?? true,
          balanceFacultyDailyLoad: data.balanceFacultyDailyLoad ?? true,
          preferLabsInBlocks: data.preferLabsInBlocks ?? true,
          avoidFirstPeriodForFaculty: data.avoidFirstPeriodForFaculty ?? false,
          avoidLastPeriodForFaculty: data.avoidLastPeriodForFaculty ?? false,
          allowFreePeriodsForClasses: data.allowFreePeriodsForClasses ?? true,
          allowUnassignedSlots: data.allowUnassignedSlots ?? false,
          softConstraintWeights: {
            ...DEFAULT_WEIGHTS,
            ...(data.softConstraintWeights || {}),
          },
        });
      }
    } catch {
      // If none found, revert to defaults with active term IDs
      setSettingsId(null);
      setFormData({
        ...DEFAULT_SETTINGS,
        academicYearId: selectedYearId,
        semesterTypeId: selectedSemTypeId,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, selectedSemTypeId]);

  useEffect(() => {
    if (selectedYearId && selectedSemTypeId) {
      fetchSettings();
    }
  }, [fetchSettings, selectedYearId, selectedSemTypeId]);

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYearId || !selectedSemTypeId) return;

    try {
      setSaving(true);
      const payload: SchedulingSettingsFormData = {
        ...formData,
        academicYearId: selectedYearId,
        semesterTypeId: selectedSemTypeId,
      };

      if (settingsId) {
        await schedulingSettingsService.update(settingsId, payload);
        toast.showToast("Scheduling policy & constraints updated successfully", "success");
      } else {
        const created = await schedulingSettingsService.create(payload);
        setSettingsId(created.id);
        toast.showToast("New scheduling policy established successfully", "success");
      }
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Failed to save scheduling settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const updateWeight = (key: keyof SoftConstraintWeights, val: number) => {
    setFormData((prev) => ({
      ...prev,
      softConstraintWeights: {
        ...prev.softConstraintWeights,
        [key]: val,
      },
    }));
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Global Scheduling Policies & Weights"
        description="Configure institutional workload caps, fatigue mitigation rules, and soft constraint priority weights for the optimizer."
        breadcrumbs={[{ label: "Scheduler & Constraints" }, { label: "Scheduling Settings" }]}
        actions={
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? "Saving Policy..." : "Save Configuration"}
          </button>
        }
      />

      {/* Term Selector */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Target Academic Year
              </span>
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.isCurrent ? "(Current Active Term)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                Target Semester Type
              </span>
            </label>
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
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Faculty Rules */}
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Section 1: Faculty Workload & Fatigue Limits</h2>
              <p className="text-[11px] text-slate-500">
                Default baseline thresholds. Faculty-specific limits in staff records will override these values.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Max Faculty Hours / Day
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={formData.maxFacultyHoursPerDay}
                onChange={(e) =>
                  setFormData({ ...formData, maxFacultyHoursPerDay: parseInt(e.target.value) || 1 })
                }
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">Recommended: 4 to 5 periods daily.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Max Consecutive Faculty Hours
              </label>
              <input
                type="number"
                min={1}
                max={6}
                value={formData.maxFacultyConsecutiveHours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxFacultyConsecutiveHours: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Prevents scheduling professors for 3+ unbroken lecture hours without rest.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Class Rules */}
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
              <School className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Section 2: Cohort & Student Class Rules</h2>
              <p className="text-[11px] text-slate-500">
                Guardrails for class timetables to maximize student learning effectiveness.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Consecutive Class Hours
              </label>
              <input
                type="number"
                min={1}
                max={6}
                value={formData.maxClassConsecutiveHours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxClassConsecutiveHours: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Caps uninterrupted teaching blocks before break.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div>
                <div className="text-xs font-semibold text-slate-800">Allow Free Periods</div>
                <div className="text-[10px] text-slate-500">Allow gap hours between student classes</div>
              </div>
              <input
                type="checkbox"
                checked={formData.allowFreePeriodsForClasses}
                onChange={(e) =>
                  setFormData({ ...formData, allowFreePeriodsForClasses: e.target.checked })
                }
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div>
                <div className="text-xs font-semibold text-slate-800">Allow Unassigned Slots</div>
                <div className="text-[10px] text-slate-500">Permit early dismissal if weekly quota is met</div>
              </div>
              <input
                type="checkbox"
                checked={formData.allowUnassignedSlots}
                onChange={(e) =>
                  setFormData({ ...formData, allowUnassignedSlots: e.target.checked })
                }
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Subject & Pedagogical Distribution */}
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="p-1.5 rounded-md bg-sky-50 text-sky-600">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Section 3: Course & Lab Scheduling Strategy</h2>
              <p className="text-[11px] text-slate-500">
                Pedagogical distribution guidelines across the academic week.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div>
                <div className="text-xs font-semibold text-slate-800">Avoid Same Subject 2x/Day</div>
                <div className="text-[10px] text-slate-500">Disallow two separate theory lectures of same subject on one day</div>
              </div>
              <input
                type="checkbox"
                checked={formData.avoidSameSubjectMultipleTimesPerDay}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    avoidSameSubjectMultipleTimesPerDay: e.target.checked,
                  })
                }
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div>
                <div className="text-xs font-semibold text-slate-800">Distribute Across Week</div>
                <div className="text-[10px] text-slate-500">Evenly spread lectures with spacing between days</div>
              </div>
              <input
                type="checkbox"
                checked={formData.distributeSubjectsAcrossWeek}
                onChange={(e) =>
                  setFormData({ ...formData, distributeSubjectsAcrossWeek: e.target.checked })
                }
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div>
                <div className="text-xs font-semibold text-slate-800">Prefer Lab Blocks</div>
                <div className="text-[10px] text-slate-500">Group laboratory practicals in uninterrupted 2-3 hr continuous blocks</div>
              </div>
              <input
                type="checkbox"
                checked={formData.preferLabsInBlocks}
                onChange={(e) =>
                  setFormData({ ...formData, preferLabsInBlocks: e.target.checked })
                }
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 4 & 5: Load Balancing & Period Preferences */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <div className="p-1.5 rounded-md bg-purple-50 text-purple-600">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Section 4: Daily Workload Balancing</h2>
                <p className="text-[11px] text-slate-500">Prevent lopsided days where a teacher has 6 hrs on Mon and 0 on Tue.</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50 mt-4">
              <div>
                <div className="text-xs font-semibold text-slate-800">Balance Faculty Daily Load</div>
                <div className="text-[10px] text-slate-500">Target a uniform distribution of weekly hours per professor</div>
              </div>
              <input
                type="checkbox"
                checked={formData.balanceFacultyDailyLoad}
                onChange={(e) =>
                  setFormData({ ...formData, balanceFacultyDailyLoad: e.target.checked })
                }
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <div className="p-1.5 rounded-md bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Section 5: Period Placement Preferences</h2>
                <p className="text-[11px] text-slate-500">Fine-tune period assignment heuristics for faculty convenience.</p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Avoid First Period</div>
                  <div className="text-[10px] text-slate-500">Deprecate scheduling first hour when possible</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.avoidFirstPeriodForFaculty}
                  onChange={(e) =>
                    setFormData({ ...formData, avoidFirstPeriodForFaculty: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Avoid Last Period</div>
                  <div className="text-[10px] text-slate-500">Minimize end-of-day burnout periods</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.avoidLastPeriodForFaculty}
                  onChange={(e) =>
                    setFormData({ ...formData, avoidLastPeriodForFaculty: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Optimization Priorities (Soft Constraint Weights 1-10) */}
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Section 6: Soft Constraint Priority Weights</h2>
                <p className="text-[11px] text-slate-500">
                  Calibrate the objective function (1 = Minimal preference, 10 = Vital priority).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, softConstraintWeights: DEFAULT_WEIGHTS }))
              }
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Subject Distribution */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">Subject Distribution</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                    {formData.softConstraintWeights.subjectDistribution} / 10
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-3">
                  Spread course lectures evenly across different days of the week.
                </p>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={formData.softConstraintWeights.subjectDistribution}
                onChange={(e) => updateWeight("subjectDistribution", parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* 2. Faculty Load Balance */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">Faculty Load Balance</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                    {formData.softConstraintWeights.facultyLoadBalance} / 10
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-3">
                  Equitably balance daily teaching workloads across teaching faculty.
                </p>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={formData.softConstraintWeights.facultyLoadBalance}
                onChange={(e) => updateWeight("facultyLoadBalance", parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* 3. Avoid Consecutive Hours */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">Avoid Fatigue Clumping</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                    {formData.softConstraintWeights.avoidConsecutiveHours} / 10
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-3">
                  Discourage clumping classes together without recovery breathers.
                </p>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={formData.softConstraintWeights.avoidConsecutiveHours}
                onChange={(e) => updateWeight("avoidConsecutiveHours", parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* 4. Preferred Availability */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">Honor Preferences</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                    {formData.softConstraintWeights.preferredAvailability} / 10
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-3">
                  Reward assigning professors to slots they marked as PREFERRED.
                </p>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={formData.softConstraintWeights.preferredAvailability}
                onChange={(e) => updateWeight("preferredAvailability", parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* 5. Avoid Availability */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">Avoid Inconvenient Slots</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                    {formData.softConstraintWeights.avoidAvailability} / 10
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-3">
                  Penalize placing professors in slots marked as AVOID.
                </p>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={formData.softConstraintWeights.avoidAvailability}
                onChange={(e) => updateWeight("avoidAvailability", parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* 6. Avoid Last Period */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">Avoid Last Period</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                    {formData.softConstraintWeights.avoidLastPeriod} / 10
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-3">
                  Penalize late evening last period allocations.
                </p>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={formData.softConstraintWeights.avoidLastPeriod}
                onChange={(e) => updateWeight("avoidLastPeriod", parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* 7. Avoid First Period */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">Avoid First Period</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                    {formData.softConstraintWeights.avoidFirstPeriod} / 10
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-3">
                  Penalize early morning opening slots when alternatives exist.
                </p>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={formData.softConstraintWeights.avoidFirstPeriod}
                onChange={(e) => updateWeight("avoidFirstPeriod", parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* 8. Lab Block Continuity */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">Lab Block Continuity</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                    {formData.softConstraintWeights.labBlockContinuity} / 10
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-3">
                  High priority to prevent fragmentation of 2-3 hr laboratory practicals.
                </p>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={formData.softConstraintWeights.labBlockContinuity}
                onChange={(e) => updateWeight("labBlockContinuity", parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
