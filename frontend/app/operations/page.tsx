"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { operationsService, substitutionService, facultyService, timeSlotsService } from "@/services";
import { DailyScheduleSummary, Faculty, TimeSlot, LeaveImpactResponse } from "@/types";
import { useToast } from "@/components/Toast";
import {
  Calendar,
  AlertTriangle,
  UserX,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Search,
  RefreshCw,
  CalendarDays,
  FileCheck,
  Sparkles,
} from "lucide-react";

export default function OperationsDashboardPage() {
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [schedule, setSchedule] = useState<DailyScheduleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Emergency Absence Modal
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyFacultyId, setEmergencyFacultyId] = useState("");
  const [emergencyFullDay, setEmergencyFullDay] = useState(true);
  const [emergencySlots, setEmergencySlots] = useState<string[]>([]);
  const [emergencyReason, setEmergencyReason] = useState("");
  const [emergencySubmitting, setEmergencySubmitting] = useState(false);
  const [emergencyResult, setEmergencyResult] = useState<LeaveImpactResponse | null>(null);

  const fetchDailySummary = async (dateStr: string) => {
    try {
      setLoading(true);
      const data = await operationsService.getDailySchedule(dateStr);
      setSchedule(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load operational schedule");
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async () => {
    try {
      const [fRes, slots] = await Promise.all([
        facultyService.getAll().catch(() => null),
        timeSlotsService.getAll().catch(() => []),
      ]);
      const fList: Faculty[] = Array.isArray(fRes) ? fRes : ((fRes as any)?.data || []);
      setFacultyList(fList);
      setTimeSlots(slots.filter((s) => s.slotType === "PERIOD"));
    } catch {
      // Non-fatal
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchDailySummary(selectedDate);
    }
  }, [selectedDate]);

  const handleEmergencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyFacultyId) {
      toast.error("Please select a faculty member");
      return;
    }
    if (!emergencyReason.trim()) {
      toast.error("Please enter a reason for the absence");
      return;
    }
    try {
      setEmergencySubmitting(true);
      const res = await substitutionService.emergencyFacultyAbsence({
        facultyId: emergencyFacultyId,
        date: selectedDate,
        fullDay: emergencyFullDay,
        affectedTimeSlotIds: emergencySlots,
        reason: emergencyReason,
      });
      toast.success("Emergency absence recorded and timetable impact analyzed!");
      setEmergencyResult(res.impact);
      fetchDailySummary(selectedDate);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to record emergency absence");
    } finally {
      setEmergencySubmitting(false);
    }
  };

  const normalCount = schedule?.sessions?.filter((s) => s.sessionStatus === "NORMAL").length || 0;

  return (
    <PermissionGuard
      requiredRoles={["SUPER_ADMIN", "ADMIN", "HOD"]}
      fallback={
        <AdminLayout>
          <div className="p-8 text-center text-slate-500">
            You do not have permission to access the Operations Hub.
          </div>
        </AdminLayout>
      }
    >
      <AdminLayout>
        <PageHeader
          title="Academic Operations Hub"
          description="Real-time daily timetable operations, faculty leaves, temporary substitutions, and schedule continuity."
          breadcrumbs={[{ label: "Operations" }]}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 shadow-2xs"
              />
              <button
                onClick={() => fetchDailySummary(selectedDate)}
                className="p-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs"
                title="Refresh schedule"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => {
                  setEmergencyResult(null);
                  setEmergencyReason("");
                  setEmergencyFacultyId("");
                  setShowEmergencyModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors"
              >
                <UserX className="w-3.5 h-3.5" />
                Quick Absence Action
              </button>
            </div>
          }
        />

        {/* Quick Nav Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Link
            href="/operations/daily"
            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-600 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-indigo-600 mb-2">
                <CalendarDays className="w-5 h-5" />
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs">Daily Schedule</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                View all class sessions, substitute assignments, and live status.
              </p>
            </div>
          </Link>

          <Link
            href="/operations/substitutions"
            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-amber-400 dark:hover:border-amber-600 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-amber-600 mb-2">
                <Users className="w-5 h-5" />
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs">Substitutions</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Recommendation engine with conflict detection and candidate scoring.
              </p>
            </div>
          </Link>

          <Link
            href="/operations/leave"
            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-400 dark:hover:border-emerald-600 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-emerald-600 mb-2">
                <FileCheck className="w-5 h-5" />
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs">Leave Approval Queue</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Review faculty leaves and multi-day impact on published timetables.
              </p>
            </div>
          </Link>

          <Link
            href="/academic-calendar"
            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-purple-400 dark:hover:border-purple-600 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-purple-600 mb-2">
                <Calendar className="w-5 h-5" />
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs">Academic Calendar</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Manage university holidays and special swapped working days.
              </p>
            </div>
          </Link>
        </div>

        {/* Calendar Day Resolution Banner */}
        {schedule && (
          <div
            className={`mb-6 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              !schedule.isTeachingDay
                ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200"
                : schedule.isException
                ? "bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-200"
                : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  !schedule.isTeachingDay
                    ? "bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-100"
                    : schedule.isException
                    ? "bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-100"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                }`}
              >
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm">
                  {selectedDate} • {schedule.dayOfWeek}
                  {schedule.effectiveWorkingDayName && (
                    <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                      Follows {schedule.effectiveWorkingDayName} Order
                    </span>
                  )}
                </div>
                <div className="text-xs opacity-80 mt-0.5">
                  {!schedule.isTeachingDay
                    ? `Official Non-Teaching Holiday: ${schedule.exceptionTitle || "University Holiday"}`
                    : schedule.isException
                    ? `Special Working Day: ${schedule.exceptionTitle || "Timetable swap applied"}`
                    : "Regular Academic Timetable In Session"}
                </div>
              </div>
            </div>

            <div className="text-xs font-mono font-semibold">
              Status: {schedule.isTeachingDay ? "ACTIVE INSTRUCTION" : "CLASSES SUSPENDED"}
            </div>
          </div>
        )}

        {/* Operational Stat Counters */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="text-[11px] font-medium text-slate-500 uppercase">Total Sessions</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {schedule?.scheduledClassesCount ?? 0}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="text-[11px] font-medium text-emerald-600 uppercase">Regular</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {normalCount}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="text-[11px] font-medium text-indigo-600 uppercase">Substituted</div>
            <div className="text-2xl font-black text-indigo-600 mt-1">
              {schedule?.substitutionsCount ?? 0}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="text-[11px] font-medium text-rose-600 uppercase">Unresolved</div>
            <div className="text-2xl font-black text-rose-600 mt-1">
              {schedule?.unresolvedPeriodsCount ?? 0}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="text-[11px] font-medium text-slate-400 uppercase">Cancelled</div>
            <div className="text-2xl font-black text-slate-500 mt-1">
              {schedule?.cancelledPeriodsCount ?? 0}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="text-[11px] font-medium text-amber-600 uppercase">Faculty On Leave</div>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {schedule?.facultyOnLeaveCount ?? 0}
            </div>
          </div>
        </div>

        {/* Unresolved & High Risk Sessions Warning */}
        {schedule && schedule.unresolvedPeriodsCount > 0 && (
          <div className="mb-6 p-4 bg-rose-50/90 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  Immediate Attention Required: {schedule.unresolvedPeriodsCount} session(s) scheduled today lack faculty coverage due to approved leave or absence.
                </span>
              </div>
              <Link
                href={`/operations/substitutions?date=${selectedDate}`}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg transition-colors inline-flex items-center gap-1 shrink-0"
              >
                Resolve in Substitution Manager <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Sessions Summary Table / Preview */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                Class Sessions Overview ({selectedDate})
              </h3>
              <p className="text-[11px] text-slate-500">
                Operational status of classes running across all departments
              </p>
            </div>
            <Link
              href={`/operations/daily?date=${selectedDate}`}
              className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold inline-flex items-center gap-1"
            >
              Full Daily Grid <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Period / Time</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Regular Faculty</th>
                  <th className="py-2.5 px-3">Effective Faculty</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading schedule for {selectedDate}...
                    </td>
                  </tr>
                ) : !schedule || schedule.sessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      {schedule && !schedule.isTeachingDay
                        ? "Classes are suspended for this holiday."
                        : "No scheduled sessions found for this date."}
                    </td>
                  </tr>
                ) : (
                  schedule.sessions.slice(0, 15).map((s) => (
                    <tr
                      key={s.entryId}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        s.sessionStatus === "UNRESOLVED"
                          ? "bg-rose-50/40 dark:bg-rose-950/20"
                          : ""
                      }`}
                    >
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {s.timeSlotName}
                        <div className="text-[10px] text-slate-400 font-mono">
                          {s.startTime} - {s.endTime}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {s.className}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {s.subjectName}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {s.subjectCode}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={
                            s.sessionStatus === "UNRESOLVED" || s.sessionStatus === "SUBSTITUTED"
                              ? "line-through text-slate-400"
                              : "text-slate-700 dark:text-slate-300 font-medium"
                          }
                        >
                          {s.scheduledFacultyNames?.join(", ") || "Faculty"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {s.effectiveFacultyName ? (
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {s.effectiveFacultyName}
                            {s.sessionStatus === "SUBSTITUTED" && (
                              <span className="ml-1 text-[9px] px-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800">
                                Sub
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.sessionStatus === "NORMAL"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : s.sessionStatus === "SUBSTITUTED"
                              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                              : s.sessionStatus === "UNRESOLVED"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {s.sessionStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {s.sessionStatus === "UNRESOLVED" && (
                          <Link
                            href={`/operations/substitutions?date=${selectedDate}&entryId=${s.entryId}`}
                            className="px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                          >
                            Assign Sub
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {schedule && schedule.sessions.length > 15 && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
              <Link
                href={`/operations/daily?date=${selectedDate}`}
                className="text-indigo-600 font-semibold hover:underline"
              >
                Showing 15 of {schedule.sessions.length} sessions. View full daily timetable →
              </Link>
            </div>
          )}
        </div>

        {/* EMERGENCY ABSENCE ACTION MODAL */}
        {showEmergencyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in">
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-100 dark:border-rose-900/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <h3 className="font-bold text-rose-900 dark:text-rose-200 text-sm">
                    Mark Emergency Faculty Absence
                  </h3>
                </div>
                <button
                  onClick={() => setShowEmergencyModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              </div>

              {!emergencyResult ? (
                <form onSubmit={handleEmergencySubmit} className="p-5 space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Faculty Member
                    </label>
                    <select
                      required
                      value={emergencyFacultyId}
                      onChange={(e) => setEmergencyFacultyId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="">Select absent faculty member...</option>
                      {facultyList.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.facultyCode || f.designation || "Faculty"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        Absence Date
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        Absence Type
                      </label>
                      <select
                        value={emergencyFullDay ? "FULL" : "PARTIAL"}
                        onChange={(e) => setEmergencyFullDay(e.target.value === "FULL")}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      >
                        <option value="FULL">Full Day Absence</option>
                        <option value="PARTIAL">Selected Time Periods</option>
                      </select>
                    </div>
                  </div>

                  {!emergencyFullDay && (
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        Select Affected Periods
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {timeSlots.map((ts) => {
                          const isSelected = emergencySlots.includes(ts.id);
                          return (
                            <button
                              key={ts.id}
                              type="button"
                              onClick={() => {
                                setEmergencySlots(
                                  isSelected
                                    ? emergencySlots.filter((id) => id !== ts.id)
                                    : [...emergencySlots, ts.id]
                                );
                              }}
                              className={`p-2 rounded-lg border text-center text-xs transition-colors ${
                                isSelected
                                  ? "bg-rose-600 text-white border-rose-600"
                                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              <div className="font-bold">{ts.name}</div>
                              <div className="text-[10px] opacity-75">{ts.startTime}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Absence Reason
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={emergencyReason}
                      onChange={(e) => setEmergencyReason(e.target.value)}
                      placeholder="e.g. Unplanned medical leave, emergency family obligation..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    This will immediately generate an approved emergency leave record, release the faculty from their timetable obligations on this date, and mark their scheduled classes as requiring substitutes.
                  </p>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowEmergencyModal(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={emergencySubmitting}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50"
                    >
                      {emergencySubmitting ? "Recording..." : "Record Emergency Absence"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-5 space-y-4 text-xs">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Emergency Leave Confirmed</div>
                      <div className="text-[11px]">
                        {emergencyResult.totalAffectedPeriods} class period(s) flagged for substitution on {selectedDate}.
                      </div>
                    </div>
                  </div>

                  {emergencyResult.affectedPeriods.length > 0 && (
                    <div className="max-h-56 overflow-y-auto space-y-2">
                      {emergencyResult.affectedPeriods.map((p, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center"
                        >
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {p.timeSlotName} ({p.startTime} - {p.endTime})
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {p.className} • {p.subjectName}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            Needs Substitute
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setShowEmergencyModal(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                    >
                      Close
                    </button>
                    <Link
                      href={`/operations/substitutions?date=${selectedDate}`}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Find Substitutes Now
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </AdminLayout>
    </PermissionGuard>
  );
}
