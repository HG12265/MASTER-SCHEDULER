"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import {
  timetablesService,
  leaveService,
  operationsService,
  notificationService,
  facultyService,
} from "@/services";
import {
  Timetable,
  TimetableEntry,
  LeaveRequest,
  DailyScheduleSession,
  AppNotification,
} from "@/types";
import {
  Calendar,
  Clock,
  BookOpen,
  CalendarCheck,
  AlertCircle,
  Bell,
  ArrowRight,
  UserCheck,
} from "lucide-react";

export default function FacultyPortalDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todaySessions, setTodaySessions] = useState<DailyScheduleSession[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [weeklyScheduledHours, setWeeklyScheduledHours] = useState(0);

  const facultyId = user?.facultyId;

  useEffect(() => {
    async function loadPortalData() {
      try {
        setLoading(true);
        const todayStr = new Date().toISOString().split("T")[0];

        const [dailyRes, notifs] = await Promise.all([
          operationsService.getDailySchedule(todayStr).catch(() => null),
          notificationService.getNotifications(5).catch(() => []),
        ]);

        if (dailyRes && facultyId) {
          const mySessions = dailyRes.sessions.filter((s) =>
            s.scheduledFacultyIds.includes(facultyId) || s.effectiveFacultyId === facultyId
          );
          setTodaySessions(mySessions);
        }

        if (facultyId) {
          const leaves = await leaveService.listLeaveRequests({ facultyId }).catch(() => []);
          setMyLeaves(leaves);

          // Get published timetables to calculate weekly hours
          const pubTimetables = await timetablesService.getAll({ status: "PUBLISHED" }).catch(() => []);
          if (Array.isArray(pubTimetables) && pubTimetables.length > 0) {
            const ttId = pubTimetables[0].id;
            const entries = await timetablesService.getEntries(ttId).catch(() => []);
            const myWeekly = entries.filter((e: TimetableEntry) => e.facultyIds?.includes(facultyId));
            setWeeklyScheduledHours(myWeekly.length);
          }
        }

        setNotifications(notifs || []);
      } catch (err) {
        console.error("Failed to load faculty portal data", err);
      } finally {
        setLoading(false);
      }
    }

    loadPortalData();
  }, [facultyId]);

  return (
    <AdminLayout>
      <PageHeader
        title={`Welcome, ${user?.username || "Faculty Member"}`}
        description="Your personalized teaching schedule, active substitution alerts, and leave portal."
        breadcrumbs={[
          { label: "Faculty Portal", href: "/faculty-portal" },
          { label: "Dashboard" },
        ]}
      />

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Today's Classes
            </span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {todaySessions.length}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Scheduled for today</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Weekly Load
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {weeklyScheduledHours} <span className="text-xs font-normal text-slate-500">hrs/week</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Published timetable hours</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Leave Requests
            </span>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-lg">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {myLeaves.filter((l) => l.status === "PENDING").length}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Pending review</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Active Profile
            </span>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-lg">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white truncate">
            {user?.facultyName || user?.username}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-mono">
            {user?.role}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule Column */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" /> Today's Teaching Schedule
            </h2>
            <Link
              href="/faculty-portal/timetable"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Full Timetable <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Loading schedule...
            </div>
          ) : todaySessions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              No classes scheduled for you today.
            </div>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((session) => (
                <div
                  key={session.entryId}
                  className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex flex-col items-center justify-center text-center font-mono">
                      <span className="text-[10px] uppercase font-bold">Slot</span>
                      <span className="text-sm font-extrabold">{session.slotOrder}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                        {session.subjectName} ({session.subjectCode})
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Class: <strong>{session.className}</strong>
                        {session.resourceName && (
                          <span className="ml-2 font-mono text-slate-400">
                            Room: {session.resourceName}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {session.startTime} - {session.endTime}
                    </span>
                    <div className="mt-1">
                      {session.sessionStatus === "SUBSTITUTED" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Substituted ({session.effectiveFacultyName})
                        </span>
                      ) : session.sessionStatus === "CANCELLED" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          Cancelled
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications & Leave Column */}
        <div className="space-y-6">
          {/* Quick Leave Box */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                My Leave Requests
              </h3>
              <Link
                href="/faculty-portal/leave"
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Apply Leave →
              </Link>
            </div>
            {myLeaves.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No leave requests filed.
              </p>
            ) : (
              <div className="space-y-2">
                {myLeaves.slice(0, 3).map((l) => (
                  <div
                    key={l.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {l.startDate} {l.startDate !== l.endDate ? `to ${l.endDate}` : ""}
                      </div>
                      <span className="text-[10px] text-slate-400">{l.leaveType}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        l.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : l.status === "REJECTED"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Alerts */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs p-5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-indigo-600" /> Recent Alerts
            </h3>
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No new alerts.
              </p>
            ) : (
              <div className="space-y-2.5 text-xs">
                {notifications.slice(0, 4).map((n) => (
                  <div key={n.id} className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                      {n.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
