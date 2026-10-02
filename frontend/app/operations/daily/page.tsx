"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { operationsService } from "@/services";
import { DailyScheduleSummary, DailyScheduleSession } from "@/types";
import { useToast } from "@/components/Toast";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  AlertCircle,
  Building,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function DailyOperationsSchedulePage() {
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [schedule, setSchedule] = useState<DailyScheduleSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("ALL");

  const fetchDaily = async (dateStr: string) => {
    try {
      setLoading(true);
      const data = await operationsService.getDailySchedule(dateStr);
      setSchedule(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load daily schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchDaily(selectedDate);
    }
  }, [selectedDate]);

  const changeDateByDays = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const setToday = () => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  };

  // Filter sessions
  const sessions = schedule?.sessions || [];
  const uniqueClasses = Array.from(new Set(sessions.map((s) => s.className))).sort();

  const filteredSessions = sessions.filter((s) => {
    if (statusFilter !== "ALL" && s.sessionStatus !== statusFilter) {
      return false;
    }
    if (selectedClassFilter !== "ALL" && s.className !== selectedClassFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchFaculty =
        s.scheduledFacultyNames?.some((n) => n.toLowerCase().includes(q)) ||
        s.effectiveFacultyName?.toLowerCase().includes(q);
      const matchSubject =
        s.subjectName?.toLowerCase().includes(q) || s.subjectCode?.toLowerCase().includes(q);
      const matchClass = s.className?.toLowerCase().includes(q);
      const matchRoom = s.resourceName?.toLowerCase().includes(q);
      if (!matchFaculty && !matchSubject && !matchClass && !matchRoom) {
        return false;
      }
    }
    return true;
  });

  const normalSessionsCount = sessions.filter((s) => s.sessionStatus === "NORMAL").length;

  return (
    <PermissionGuard
      requiredRoles={["SUPER_ADMIN", "ADMIN", "HOD", "FACULTY", "VIEWER"]}
      fallback={
        <AdminLayout>
          <div className="p-8 text-center text-slate-500">
            Access denied to daily operational schedule.
          </div>
        </AdminLayout>
      }
    >
      <AdminLayout>
        <PageHeader
          title="Daily Operational Timetable"
          description="View resolved class-by-class teaching operations, including approved faculty leaves and temporary substitutes."
          breadcrumbs={[
            { label: "Operations", href: "/operations" },
            { label: "Daily Schedule" },
          ]}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs overflow-hidden">
                <button
                  onClick={() => changeDateByDays(-1)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2 py-1 bg-transparent text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 border-x border-slate-200 dark:border-slate-700"
                />
                <button
                  onClick={() => changeDateByDays(1)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={setToday}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs"
              >
                Today
              </button>

              <button
                onClick={() => fetchDaily(selectedDate)}
                className="p-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs"
                title="Refresh schedule"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          }
        />

        {/* Date Context Header */}
        {schedule && (
          <div
            className={`mb-4 p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
              !schedule.isTeachingDay
                ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200"
                : schedule.isException
                ? "bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-200"
                : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-xl shadow-2xs text-indigo-600 dark:text-indigo-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm flex items-center gap-2">
                  {selectedDate} • {schedule.dayOfWeek}
                  {schedule.effectiveWorkingDayName && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 font-medium">
                      Following {schedule.effectiveWorkingDayName} Timetable
                    </span>
                  )}
                </h2>
                <p className="text-xs opacity-75 mt-0.5">
                  {!schedule.isTeachingDay
                    ? `Holiday: ${schedule.exceptionTitle || "University classes suspended"}`
                    : schedule.isException
                    ? `Special Working Day: ${schedule.exceptionTitle || "Timetable swap active"}`
                    : "Standard Teaching Timetable Day"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>{normalSessionsCount} Normal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                <span>{schedule.substitutionsCount} Substituted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                <span>{schedule.unresolvedPeriodsCount} Unresolved</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                <span>{schedule.cancelledPeriodsCount} Cancelled</span>
              </div>
            </div>
          </div>
        )}

        {/* Filters Toolbar */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search faculty, class, subject..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-medium"
            >
              <option value="ALL">All Statuses ({sessions.length})</option>
              <option value="NORMAL">Normal</option>
              <option value="SUBSTITUTED">Substituted</option>
              <option value="UNRESOLVED">Unresolved / Needs Sub</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {uniqueClasses.length > 0 && (
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-medium"
              >
                <option value="ALL">All Classes</option>
                {uniqueClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="text-slate-500 text-[11px]">
            Showing <strong>{filteredSessions.length}</strong> of {sessions.length} sessions
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Period / Time</th>
                  <th className="py-3 px-3">Class</th>
                  <th className="py-3 px-3">Subject</th>
                  <th className="py-3 px-3">Room / Lab</th>
                  <th className="py-3 px-3">Scheduled Faculty</th>
                  <th className="py-3 px-3">Effective Faculty</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      Loading schedule for {selectedDate}...
                    </td>
                  </tr>
                ) : filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      {sessions.length === 0
                        ? "No classes scheduled for this date."
                        : "No sessions match the selected filters."}
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((s) => (
                    <tr
                      key={s.entryId}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        s.sessionStatus === "UNRESOLVED"
                          ? "bg-rose-50/40 dark:bg-rose-950/20"
                          : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {s.timeSlotName}
                        <div className="text-[10px] text-slate-400 font-mono">
                          {s.startTime} - {s.endTime}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {s.className}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {s.subjectName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {s.subjectCode}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {s.resourceName ? (
                          <span className="inline-flex items-center gap-1 font-mono text-slate-600 dark:text-slate-300">
                            <Building className="w-3 h-3 text-slate-400" />
                            {s.resourceName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div
                          className={
                            s.sessionStatus === "UNRESOLVED" || s.sessionStatus === "SUBSTITUTED"
                              ? "line-through text-slate-400"
                              : "font-medium text-slate-700 dark:text-slate-200"
                          }
                        >
                          {s.scheduledFacultyNames?.join(", ") || "Faculty"}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {s.effectiveFacultyName ? (
                          <div>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {s.effectiveFacultyName}
                            </span>
                            {s.sessionStatus === "SUBSTITUTED" && (
                              <div className="text-[10px] text-indigo-500 font-medium">
                                Substitute Assigned
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-rose-500 font-semibold italic text-[11px]">
                            No Teacher Assigned
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
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
                      <td className="py-3 px-4 text-right">
                        {s.sessionStatus === "UNRESOLVED" ? (
                          <Link
                            href={`/operations/substitutions?date=${selectedDate}&entryId=${s.entryId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                          >
                            <Sparkles className="w-3 h-3" />
                            Find Sub
                          </Link>
                        ) : s.sessionStatus === "SUBSTITUTED" ? (
                          <Link
                            href={`/operations/substitutions?date=${selectedDate}`}
                            className="text-slate-500 hover:text-indigo-600 text-[11px] font-medium"
                          >
                            Details
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    </PermissionGuard>
  );
}
