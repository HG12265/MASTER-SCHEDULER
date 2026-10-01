"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BookMarked,
  Save,
  RotateCcw,
  Calendar,
  Layers,
  School,
  BookOpen,
  Clock,
  Star,
  Ban,
  CheckCircle,
  Info,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { subjectConstraintsService } from "@/services/subjectConstraints";
import { academicYearsService } from "@/services/academicYears";
import { semesterTypesService } from "@/services/semesterTypes";
import { classesService } from "@/services/classes";
import { subjectsService } from "@/services/subjects";
import { workingDaysService } from "@/services/workingDays";
import { timeSlotsService } from "@/services/timeSlots";
import {
  AcademicYear,
  SemesterType,
  ClassEntity,
  Subject,
  WorkingDay,
  TimeSlot,
  SubjectConstraintFormData,
} from "@/types";

export default function SubjectConstraintsPage() {
  const toast = useToast();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesterTypes, setSemesterTypes] = useState<SemesterType[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);
  const [teachingSlots, setTeachingSlots] = useState<TimeSlot[]>([]);

  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedSemTypeId, setSelectedSemTypeId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  const [constraintId, setConstraintId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SubjectConstraintFormData>({
    academicYearId: "",
    semesterTypeId: "",
    classId: "",
    subjectId: "",
    maxSessionsPerDay: 1,
    minDaysBetweenSessions: 1,
    preferredTimeSlotIds: [],
    avoidTimeSlotIds: [],
    preferredWorkingDayIds: [],
    avoidWorkingDayIds: [],
    notes: "",
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    async function loadMasters() {
      try {
        setLoading(true);
        const [ays, sts, cls, subs, days, slots] = await Promise.all([
          academicYearsService.getAll(),
          semesterTypesService.getAll(),
          classesService.getAll({ limit: 100 }),
          subjectsService.getAll({ limit: 100 }),
          workingDaysService.getAll(),
          timeSlotsService.getAll(),
        ]);

        setAcademicYears(ays || []);
        setSemesterTypes(sts || []);
        setClasses(cls.data || []);
        setSubjects(subs.data || []);

        const sortedDays = (days || [])
          .filter((d) => d.isWorkingDay)
          .sort((a, b) => a.dayOrder - b.dayOrder);
        setWorkingDays(sortedDays);

        const sortedSlots = (slots || [])
          .filter((s) => s.isTeachingSlot)
          .sort((a, b) => a.slotOrder - b.slotOrder);
        setTeachingSlots(sortedSlots);

        const currentAy = ays.find((a) => a.isCurrent);
        const ayId = currentAy ? currentAy.id : ays[0]?.id || "";
        const semId = sts[0]?.id || "";
        const cId = cls.data[0]?.id || "";
        const sId = subs.data[0]?.id || "";

        setSelectedYearId(ayId);
        setSelectedSemTypeId(semId);
        setSelectedClassId(cId);
        setSelectedSubjectId(sId);
      } catch (err: unknown) {
        toast.showToast(err instanceof Error ? err.message : "Failed to load master filters", "error");
      } finally {
        setLoading(false);
      }
    }
    loadMasters();
  }, [toast]);

  // Fetch constraint for active class + subject
  const fetchConstraint = useCallback(async () => {
    if (!selectedYearId || !selectedSemTypeId || !selectedClassId || !selectedSubjectId) return;

    try {
      setLoading(true);
      const items = await subjectConstraintsService.getAll({
        academicYearId: selectedYearId,
        semesterTypeId: selectedSemTypeId,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        isActive: true,
      });

      if (items && items.length > 0) {
        const found = items[0];
        setConstraintId(found.id);
        setFormData({
          academicYearId: selectedYearId,
          semesterTypeId: selectedSemTypeId,
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          maxSessionsPerDay: found.maxSessionsPerDay ?? 1,
          minDaysBetweenSessions: found.minDaysBetweenSessions ?? 1,
          preferredTimeSlotIds: found.preferredTimeSlotIds || [],
          avoidTimeSlotIds: found.avoidTimeSlotIds || [],
          preferredWorkingDayIds: found.preferredWorkingDayIds || [],
          avoidWorkingDayIds: found.avoidWorkingDayIds || [],
          notes: found.notes || "",
        });
      } else {
        setConstraintId(null);
        setFormData({
          academicYearId: selectedYearId,
          semesterTypeId: selectedSemTypeId,
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          maxSessionsPerDay: 1,
          minDaysBetweenSessions: 1,
          preferredTimeSlotIds: [],
          avoidTimeSlotIds: [],
          preferredWorkingDayIds: [],
          avoidWorkingDayIds: [],
          notes: "",
        });
      }
    } catch {
      setConstraintId(null);
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, selectedSemTypeId, selectedClassId, selectedSubjectId]);

  useEffect(() => {
    if (selectedYearId && selectedSemTypeId && selectedClassId && selectedSubjectId) {
      fetchConstraint();
    }
  }, [fetchConstraint, selectedYearId, selectedSemTypeId, selectedClassId, selectedSubjectId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYearId || !selectedSemTypeId || !selectedClassId || !selectedSubjectId) return;

    try {
      setSaving(true);
      const payload: SubjectConstraintFormData = {
        ...formData,
        academicYearId: selectedYearId,
        semesterTypeId: selectedSemTypeId,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
      };

      if (constraintId) {
        await subjectConstraintsService.update(constraintId, payload);
        toast.showToast("Subject scheduling preferences updated successfully", "success");
      } else {
        const created = await subjectConstraintsService.create(payload);
        setConstraintId(created.id);
        toast.showToast("Subject scheduling preferences established", "success");
      }
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Failed to save preferences", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleDayPref = (dayId: string, type: "PREFERRED" | "AVOID") => {
    setFormData((prev) => {
      if (type === "PREFERRED") {
        const isSelected = (prev.preferredWorkingDayIds || []).includes(dayId);
        const updatedPref = isSelected
          ? (prev.preferredWorkingDayIds || []).filter((id) => id !== dayId)
          : [...(prev.preferredWorkingDayIds || []), dayId];
        const updatedAvoid = (prev.avoidWorkingDayIds || []).filter((id) => id !== dayId);
        return { ...prev, preferredWorkingDayIds: updatedPref, avoidWorkingDayIds: updatedAvoid };
      } else {
        const isSelected = (prev.avoidWorkingDayIds || []).includes(dayId);
        const updatedAvoid = isSelected
          ? (prev.avoidWorkingDayIds || []).filter((id) => id !== dayId)
          : [...(prev.avoidWorkingDayIds || []), dayId];
        const updatedPref = (prev.preferredWorkingDayIds || []).filter((id) => id !== dayId);
        return { ...prev, avoidWorkingDayIds: updatedAvoid, preferredWorkingDayIds: updatedPref };
      }
    });
  };

  const toggleSlotPref = (slotId: string, type: "PREFERRED" | "AVOID") => {
    setFormData((prev) => {
      if (type === "PREFERRED") {
        const isSelected = (prev.preferredTimeSlotIds || []).includes(slotId);
        const updatedPref = isSelected
          ? (prev.preferredTimeSlotIds || []).filter((id) => id !== slotId)
          : [...(prev.preferredTimeSlotIds || []), slotId];
        const updatedAvoid = (prev.avoidTimeSlotIds || []).filter((id) => id !== slotId);
        return { ...prev, preferredTimeSlotIds: updatedPref, avoidTimeSlotIds: updatedAvoid };
      } else {
        const isSelected = (prev.avoidTimeSlotIds || []).includes(slotId);
        const updatedAvoid = isSelected
          ? (prev.avoidTimeSlotIds || []).filter((id) => id !== slotId)
          : [...(prev.avoidTimeSlotIds || []), slotId];
        const updatedPref = (prev.preferredTimeSlotIds || []).filter((id) => id !== slotId);
        return { ...prev, avoidTimeSlotIds: updatedAvoid, preferredTimeSlotIds: updatedPref };
      }
    });
  };

  const activeSubjectObj = subjects.find((s) => s.id === selectedSubjectId);
  const activeClassObj = classes.find((c) => c.id === selectedClassId);

  return (
    <AdminLayout>
      <PageHeader
        title="Subject-Specific Scheduling Preferences"
        description="Fine-tune pedagogical placement (daily caps, preferred time slots, preferred days) per course."
        breadcrumbs={[{ label: "Scheduler & Constraints" }, { label: "Subject Preferences" }]}
        actions={
          <button
            type="button"
            disabled={saving || !selectedSubjectId}
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        }
      />

      {/* Target Selector Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Class</label>
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Subject</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.subjectCode}) [{s.subjectType}]
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {activeSubjectObj && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Course Preferences: {activeSubjectObj.name} ({activeSubjectObj.subjectCode})
                </h2>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {activeSubjectObj.subjectType} COURSE
              </span>
            </div>

            {/* Daily Sessions & Spacing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Sessions Per Day
                </label>
                <input
                  type="number"
                  min={1}
                  max={3}
                  value={formData.maxSessionsPerDay}
                  onChange={(e) =>
                    setFormData({ ...formData, maxSessionsPerDay: parseInt(e.target.value) || 1 })
                  }
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Avoids scheduling multiple periods of this subject in a single day (recommended: 1).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Minimum Days Between Sessions
                </label>
                <input
                  type="number"
                  min={0}
                  max={3}
                  value={formData.minDaysBetweenSessions}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minDaysBetweenSessions: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Spacing requirement between subsequent lectures of this course.
                </p>
              </div>
            </div>

            {/* Preferred / Avoid Working Days */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
              <h3 className="text-xs font-bold text-slate-800 mb-1">Working Day Preferences</h3>
              <p className="text-[11px] text-slate-500 mb-3">
                Click a day tag to toggle: Green = Preferred Day, Amber = Avoid Day, Gray = Neutral.
              </p>

              <div className="flex flex-wrap gap-2">
                {workingDays.map((day) => {
                  const isPref = (formData.preferredWorkingDayIds || []).includes(day.id);
                  const isAvoid = (formData.avoidWorkingDayIds || []).includes(day.id);

                  return (
                    <div key={day.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleDayPref(day.id, "PREFERRED")}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                          isPref
                            ? "bg-emerald-600 text-white font-bold border-emerald-700 shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"
                        }`}
                        title="Mark as Preferred Day"
                      >
                        {day.name} {isPref && "★"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleDayPref(day.id, "AVOID")}
                        className={`text-xs px-2 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                          isAvoid
                            ? "bg-amber-500 text-white font-bold border-amber-600 shadow-2xs"
                            : "bg-white text-slate-400 border-slate-200 hover:border-amber-300 hover:text-amber-700"
                        }`}
                        title="Mark as Avoid Day"
                      >
                        {isAvoid ? "Avoided" : "Avoid"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preferred / Avoid Time Slots */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
              <h3 className="text-xs font-bold text-slate-800 mb-1">Time Slot Preferences</h3>
              <p className="text-[11px] text-slate-500 mb-3">
                Indicate if this subject performs better in morning periods (e.g. Labs/Math) or afternoon.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {teachingSlots.map((ts) => {
                  const isPref = (formData.preferredTimeSlotIds || []).includes(ts.id);
                  const isAvoid = (formData.avoidTimeSlotIds || []).includes(ts.id);

                  return (
                    <div
                      key={ts.id}
                      className="p-2.5 rounded-lg border bg-white border-slate-200 space-y-2 shadow-2xs"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-800">{ts.name}</div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {ts.startTime} - {ts.endTime}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => toggleSlotPref(ts.id, "PREFERRED")}
                          className={`flex-1 text-[10px] py-1 rounded border font-semibold transition-colors ${
                            isPref
                              ? "bg-indigo-600 text-white border-indigo-700"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600"
                          }`}
                        >
                          Pref
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSlotPref(ts.id, "AVOID")}
                          className={`flex-1 text-[10px] py-1 rounded border font-semibold transition-colors ${
                            isAvoid
                              ? "bg-amber-500 text-white border-amber-600"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-600"
                          }`}
                        >
                          Avoid
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pedagogical Notes
              </label>
              <textarea
                rows={2}
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g. Prefer continuous lab block in morning hours before lunch."
                className="w-full text-xs p-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </form>
      )}
    </AdminLayout>
  );
}
