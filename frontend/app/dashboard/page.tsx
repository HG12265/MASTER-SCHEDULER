"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  School,
  Users,
  BookOpen,
  Building2,
  UserCheck,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Building,
  Calendar,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Clock,
  Layers,
  FileText,
  AlertTriangle,
  Info,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { dashboardService, DashboardSummaryData } from "@/services/dashboard.service";
import { TimetableStatusBadge, ValidationStatusBadge } from "@/components/timetable/TimetableStatusBadge";
import { WorkloadChart } from "@/components/dashboard/WorkloadChart";
import { ResourceUtilizationChart } from "@/components/dashboard/ResourceUtilizationChart";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getSummary();
      setSummary(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Unable to load active dashboard statistics. Ensure the FastAPI backend is running on port 8000."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const latestTt = summary?.latestTimetable;

  return (
    <AdminLayout>
      {/* Page Header */}
      <PageHeader
        title="Department Overview & Analytics"
        description="Master academic scheduler overview, operational statistics, timetable approval status, and institutional analytics."
        breadcrumbs={[{ label: "Administration" }, { label: "Dashboard" }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchSummary}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
              title="Refresh summary data"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/timetables"
              className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Layers className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Timetables
            </Link>
            <Link
              href="/scheduler"
              className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Generate Timetable
            </Link>
          </div>
        }
      />

      {/* Backend Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-800 mb-6">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <span className="font-semibold text-rose-900">Backend Communication Issue:</span> {error}
          </div>
          <button
            onClick={fetchSummary}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline shrink-0 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Active Academic Period & Publication Status Banner */}
      <div className="p-5 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl shadow-sm text-white mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold">
            <Building className="w-4 h-4" />
            <span>Active Academic Session</span>
          </div>
          <h2 className="text-xl font-bold mt-1 text-white flex items-center gap-3">
            <span>{summary?.activeAcademicYear?.name || "Academic Year"}</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {summary?.currentSemesterType?.name || "Semester"} ({summary?.currentSemesterType?.code || "SEM"})
            </span>
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Tracking {summary?.totalTimetablesCount ?? 0} total timetable iterations across the department.
          </p>
        </div>

        {/* Timetable Status Metric Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-center min-w-[80px]">
            <div className="text-xs text-emerald-400 font-bold">{summary?.publishedTimetablesCount ?? 0}</div>
            <div className="text-[10px] text-slate-300 uppercase tracking-wider">Published</div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-center min-w-[80px]">
            <div className="text-xs text-blue-400 font-bold">{summary?.readyForApprovalCount ?? 0}</div>
            <div className="text-[10px] text-slate-300 uppercase tracking-wider">In Review</div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-center min-w-[80px]">
            <div className="text-xs text-amber-400 font-bold">{summary?.draftTimetablesCount ?? 0}</div>
            <div className="text-[10px] text-slate-300 uppercase tracking-wider">Drafts</div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-center min-w-[80px]">
            <div className="text-xs text-slate-400 font-bold">{summary?.archivedTimetablesCount ?? 0}</div>
            <div className="text-[10px] text-slate-300 uppercase tracking-wider">Archived</div>
          </div>
        </div>
      </div>

      {/* Key Master Data Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
        <StatCard
          title="Programmes"
          value={isLoading ? "..." : (summary?.programmes ?? 0)}
          change="Active"
          trend="neutral"
          accent="indigo"
          icon={<GraduationCap className="w-5 h-5" />}
          description="Registered degrees"
        />
        <StatCard
          title="Classes"
          value={isLoading ? "..." : (summary?.classes ?? 0)}
          change="Active"
          trend="neutral"
          accent="blue"
          icon={<School className="w-5 h-5" />}
          description="Enrolled sections"
        />
        <StatCard
          title="Faculty"
          value={isLoading ? "..." : (summary?.faculty ?? 0)}
          change="Active"
          trend="neutral"
          accent="emerald"
          icon={<Users className="w-5 h-5" />}
          description="Academic roster"
        />
        <StatCard
          title="Subjects"
          value={isLoading ? "..." : (summary?.subjects ?? 0)}
          change="Active"
          trend="neutral"
          accent="purple"
          icon={<BookOpen className="w-5 h-5" />}
          description="Theory & Lab catalog"
        />
        <StatCard
          title="Resources"
          value={isLoading ? "..." : (summary?.resources ?? 0)}
          change="Active"
          trend="neutral"
          accent="amber"
          icon={<Building2 className="w-5 h-5" />}
          description="Rooms & Laboratories"
        />
        <StatCard
          title="Allocations"
          value={isLoading ? "..." : (summary?.allocations ?? 0)}
          change="Active"
          trend="neutral"
          accent="indigo"
          icon={<UserCheck className="w-5 h-5" />}
          description="Teaching assignments"
        />
      </div>

      {/* Attention Required & Latest Timetable Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Latest Timetable Card */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Latest Timetable Version
              </span>
              {latestTt && <TimetableStatusBadge status={latestTt.status} size="sm" />}
            </div>

            {latestTt ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Version #{latestTt.version}
                  </h3>
                  <ValidationStatusBadge status={latestTt.validationStatus} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Academic Year</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{latestTt.academicYearName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Semester</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{latestTt.semesterTypeName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Generated</span>
                    <span>{new Date(latestTt.generatedAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Entries</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{latestTt.totalSlots} slots</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                No generated timetable iterations found.
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {latestTt?.status === "PUBLISHED" ? "Official Immutable Timetable" : "Awaiting Actions"}
            </span>
            {latestTt && (
              <Link
                href={`/timetables/${latestTt.id}`}
                className="inline-flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
              >
                {latestTt.status === "DRAFT" ? "Continue Editing" : "View Timetable"} <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            )}
          </div>
        </div>

        {/* Attention Required Card */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Attention Required
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {summary?.attentionItems?.length || 0} Alerts
              </span>
            </div>

            <div className="space-y-2.5">
              {!summary?.attentionItems || summary.attentionItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-500 mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">All Schedules Operational</p>
                  <p className="text-[11px] text-slate-400">Zero pending approval bottlenecks or validation warnings detected.</p>
                </div>
              ) : (
                summary.attentionItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                      item.severity === "error"
                        ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-800 dark:text-rose-300"
                        : item.severity === "warning"
                        ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-800 dark:text-amber-300"
                        : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-800 dark:text-blue-300"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {item.severity === "error" ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold">{item.title}</div>
                        <div className="text-[11px] opacity-90 mt-0.5">{item.message}</div>
                      </div>
                    </div>
                    {item.actionUrl && (
                      <Link
                        href={item.actionUrl}
                        className="text-[11px] font-semibold underline shrink-0 hover:opacity-80"
                      >
                        Review
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Automated institutional invariant verification</span>
            <Link href="/timetables" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              All Timetables
            </Link>
          </div>
        </div>
      </div>

      {/* SVG Analytics Charts (Faculty Workload + Resource Utilization) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <WorkloadChart data={summary?.facultyWorkloadChart || []} />
        <ResourceUtilizationChart data={summary?.resourceUtilizationChart || []} />
      </div>

      {/* Quick Navigation to Phase 7 Academic Reports */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Academic Administration Reports & Exports
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/reports/faculty-workload"
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-2">
              <Users className="w-5 h-5" />
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Faculty Workload</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Required vs scheduled teaching hours and workload utilization.
            </p>
          </Link>

          <Link
            href="/reports/subject-coverage"
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-2">
              <BookOpen className="w-5 h-5" />
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Subject Coverage</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Verify syllabus hours against timetabled periods per class.
            </p>
          </Link>

          <Link
            href="/reports/resource-utilization"
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
              <Building2 className="w-5 h-5" />
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Resource Utilization</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Capacity tracking for classrooms, lecture halls, and laboratories.
            </p>
          </Link>

          <Link
            href="/settings/institution"
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
              <ShieldCheck className="w-5 h-5" />
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Institution Branding</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure official institution headers, logos, and signatures for exports.
            </p>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
