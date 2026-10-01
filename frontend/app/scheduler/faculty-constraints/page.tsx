"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Save,
  RotateCcw,
  Calendar,
  Layers,
  Clock,
  Briefcase,
  Sliders,
  Info,
  CheckCircle2,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { facultyConstraintsService } from "@/services/facultyConstraints";
import { academicYearsService } from "@/services/academicYears";
import { semesterTypesService } from "@/services/semesterTypes";
import { facultyService } from "@/services/faculty";
import {
  AcademicYear,
  SemesterType,
  Faculty,
  FacultyConstraintFormData,
} from "@/types";

export default function FacultyConstraintsPage() {
  const toast = useToast();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesterTypes, setSemesterTypes] = useState<SemesterType[]>([]);
  const [facultyMembers, setFacultyMembers] = useState<Faculty[]>([]);

  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedSemTypeId, setSelectedSemTypeId] = useState<string>("");
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");

  const [constraintId, setConstraintId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FacultyConstraintFormData>({
    academicYearId: "",
    semesterTypeId: "",
    facultyId: "",
    preferredMaxHoursPerDay: 4,
    preferredMinHoursPerDay: 1,
    avoidFirstPeriod: false,
    avoidLastPeriod: false,
    preferCompactSchedule: true,
    minimumGapBetweenSessions: 0,
    notes: "",
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    async function loadMasters() {
      try {
        setLoading(true);
        const [ays, sts, facs] = await Promise.all([
          academicYearsService.getAll(),
          semesterTypesService.getAll(),
          facultyService.getAll({ limit: 150, isActive: true }),
        ]);

        setAcademicYears(ays || []);
        setSemesterTypes(sts || []);
        setFacultyMembers(facs.data || []);

        const currentAy = ays.find((a) => a.isCurrent);
        const ayId = currentAy ? currentAy.id : ays[0]?.id || "";
        const semId = sts[0]?.id || "";
        const fId = facs.data[0]?.id || "";

        setSelectedYearId(ayId);
        setSelectedSemTypeId(semId);
        setSelectedFacultyId(fId);
      } catch (err: unknown) {
        toast.showToast(err instanceof Error ? err.message : "Failed to load master filters", "error");
      } finally {
        setLoading(false);
      }
    }
    loadMasters();
  }, [toast]);

  const fetchConstraint = useCallback(async () => {
    if (!selectedYearId || !selectedSemTypeId || !selectedFacultyId) return;

    try {
      setLoading(true);
      const items = await facultyConstraintsService.getAll({
        academicYearId: selectedYearId,
        semesterTypeId: selectedSemTypeId,
        facultyId: selectedFacultyId,
        isActive: true,
      });

      if (items && items.length > 0) {
        const found = items[0];
        setConstraintId(found.id);
        setFormData({
          academicYearId: selectedYearId,
          semesterTypeId: selectedSemTypeId,
          facultyId: selectedFacultyId,
          preferredMaxHoursPerDay: found.preferredMaxHoursPerDay ?? 4,
          preferredMinHoursPerDay: found.preferredMinHoursPerDay ?? 1,
          avoidFirstPeriod: found.avoidFirstPeriod ?? false,
          avoidLastPeriod: found.avoidLastPeriod ?? false,
          preferCompactSchedule: found.preferCompactSchedule ?? true,
          minimumGapBetweenSessions: found.minimumGapBetweenSessions ?? 0,
          notes: found.notes || "",
        });
      } else {
        setConstraintId(null);
        setFormData({
          academicYearId: selectedYearId,
          semesterTypeId: selectedSemTypeId,
          facultyId: selectedFacultyId,
          preferredMaxHoursPerDay: 4,
          preferredMinHoursPerDay: 1,
          avoidFirstPeriod: false,
          avoidLastPeriod: false,
          preferCompactSchedule: true,
          minimumGapBetweenSessions: 0,
          notes: "",
        });
      }
    } catch {
      setConstraintId(null);
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, selectedSemTypeId, selectedFacultyId]);

  useEffect(() => {
    if (selectedYearId && selectedSemTypeId && selectedFacultyId) {
      fetchConstraint();
    }
  }, [fetchConstraint, selectedYearId, selectedSemTypeId, selectedFacultyId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYearId || !selectedSemTypeId || !selectedFacultyId) return;

    try {
      setSaving(true);
      const payload: FacultyConstraintFormData = {
        ...formData,
        academicYearId: selectedYearId,
        semesterTypeId: selectedSemTypeId,
        facultyId: selectedFacultyId,
      };

      if (constraintId) {
        await facultyConstraintsService.update(constraintId, payload);
        toast.showToast("Faculty schedule preferences updated", "success");
      } else {
        const created = await facultyConstraintsService.create(payload);
        setConstraintId(created.id);
        toast.showToast("Faculty schedule preferences created", "success");
      }
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Failed to save preferences", "error");
    } finally {
      setSaving(false);
    }
  };

  const activeFacultyObj = facultyMembers.find((f) => f.id === selectedFacultyId);

  return (
    <AdminLayout>
      <PageHeader
        title="Faculty Scheduling Preferences"
        description="Configure tailored workload balancing, first/last period avoidance, and compact timetable preferences per faculty member."
        breadcrumbs={[{ label: "Scheduler & Constraints" }, { label: "Faculty Constraints" }]}
        actions={
          <button
            type="button"
            disabled={saving || !selectedFacultyId}
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? "Saving..." : "Save Preferences"}
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Faculty Member</label>
            <select
              value={selectedFacultyId}
              onChange={(e) => setSelectedFacultyId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {facultyMembers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.facultyCode}) — {f.designation || "Faculty"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {activeFacultyObj && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Base Workload Profile Card */}
          <div className="p-5 rounded-xl border border-indigo-200 bg-indigo-50/40">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4 text-indigo-700" />
              <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                Permanent Staff Profile: {activeFacultyObj.name} ({activeFacultyObj.facultyCode})
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-white rounded-lg border border-indigo-100 shadow-2xs">
                <span className="text-[11px] text-slate-500 block">Max Weekly Load</span>
                <span className="text-base font-bold text-slate-900">
                  {activeFacultyObj.maxHoursPerWeek} hrs / week
                </span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-indigo-100 shadow-2xs">
                <span className="text-[11px] text-slate-500 block">Max Daily Load</span>
                <span className="text-base font-bold text-slate-900">
                  {activeFacultyObj.maxHoursPerDay} hrs / day
                </span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-indigo-100 shadow-2xs">
                <span className="text-[11px] text-slate-500 block">Max Consecutive</span>
                <span className="text-base font-bold text-slate-900">
                  {activeFacultyObj.maxConsecutiveHours} hrs unbroken
                </span>
              </div>
            </div>
            <p className="text-[10px] text-indigo-700 mt-2.5">
              These base limits originate from the faculty profile and serve as hard constraints. Additional optimizer preferences below guide how those hours are scheduled.
            </p>
          </div>

          {/* Form Options */}
          <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-6">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Term Preferences & Optimization Guidance
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Min Hours / Day
                </label>
                <input
                  type="number"
                  min={0}
                  max={6}
                  value={formData.preferredMinHoursPerDay ?? 1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferredMinHoursPerDay: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Prevents coming in for just a 1-hour class.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Max Hours / Day
                </label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={formData.preferredMaxHoursPerDay ?? 4}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferredMaxHoursPerDay: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Soft target ceiling below the hard limit.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Minimum Gap Between Sessions (Periods)
                </label>
                <input
                  type="number"
                  min={0}
                  max={3}
                  value={formData.minimumGapBetweenSessions ?? 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minimumGapBetweenSessions: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Breathers between teaching periods.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Avoid First Period</div>
                  <div className="text-[10px] text-slate-500">Discourage scheduling opening hour</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.avoidFirstPeriod}
                  onChange={(e) =>
                    setFormData({ ...formData, avoidFirstPeriod: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Avoid Last Period</div>
                  <div className="text-[10px] text-slate-500">Discourage scheduling closing hour</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.avoidLastPeriod}
                  onChange={(e) =>
                    setFormData({ ...formData, avoidLastPeriod: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Compact Schedule</div>
                  <div className="text-[10px] text-slate-500">Cluster lectures together without idle gaps</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.preferCompactSchedule}
                  onChange={(e) =>
                    setFormData({ ...formData, preferCompactSchedule: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Special Scheduling Notes
              </label>
              <textarea
                rows={2}
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g. Conducts Ph.D. guidance or external committee work."
                className="w-full text-xs p-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </form>
      )}
    </AdminLayout>
  );
}
