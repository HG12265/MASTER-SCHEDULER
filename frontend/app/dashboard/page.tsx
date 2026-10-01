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
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { dashboardService, DashboardSummaryData } from "@/services/dashboard.service";

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

  return (
    <AdminLayout>
      {/* Page Header */}
      <PageHeader
        title="Department Overview"
        description="Master academic scheduler overview, operational statistics, and timetable solver readiness."
        breadcrumbs={[{ label: "Administration" }, { label: "Dashboard" }]}
        actions={
          <>
            <button
              onClick={fetchSummary}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh summary data"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/academic-setup"
              className="inline-flex items-center px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Academic Setup
            </Link>
            <Link
              href="/scheduler"
              className="inline-flex items-center px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Scheduler Engine
            </Link>
          </>
        }
      />

      {/* Backend Disconnection / Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-800">
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

      {/* Key Metrics Grid (Live Database Counts) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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

      {/* Architecture Readiness & System Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* CP-SAT Engine Card */}
        <div className="p-6 bg-white border border-slate-200/90 rounded-xl shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Constraint Engine
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                OR-Tools CP-SAT
              </span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900">
              Timetable Optimizer
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Mathematical solver architecture ready for exact scheduling: hard constraints guarantee zero faculty, room, and class overlaps.
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center text-xs text-slate-600">
                <CheckCircle className="w-4 h-4 mr-2 text-emerald-500 shrink-0" />
                <span>Zero Hardcoded Entities Architecture</span>
              </div>
              <div className="flex items-center text-xs text-slate-600">
                <CheckCircle className="w-4 h-4 mr-2 text-emerald-500 shrink-0" />
                <span>Async MongoDB Repository & Service Layer</span>
              </div>
              <div className="flex items-center text-xs text-slate-600">
                <CheckCircle className="w-4 h-4 mr-2 text-emerald-500 shrink-0" />
                <span>Multi-period Lab & Theory Session Alignment</span>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-6 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Solver Phase: Next Step
            </span>
            <Link
              href="/scheduler"
              className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Configure Constraints <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </div>

        {/* Database Driven Design Banner */}
        <div className="p-6 bg-linear-to-br from-slate-900 to-indigo-950 text-white rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold">
              <Building className="w-4 h-4" />
              <span>University Configuration</span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-white">
              100% Dynamic Metadata
            </h3>
            <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
              Administrators can introduce new programmes, semesters, elective groupings, and room laboratories at any time directly through the administration portal without modifying code.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10">
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <div className="text-[11px] text-slate-300">Phase 2 Status</div>
                <div className="text-base font-bold text-white mt-0.5">CRUD Active</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <div className="text-[11px] text-slate-300">Data Integrity</div>
                <div className="text-base font-bold text-white mt-0.5">Enforced</div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-white/10">
            <Link
              href="/academic-setup"
              className="inline-flex items-center text-xs font-semibold text-indigo-300 hover:text-white transition-colors"
            >
              Modify Working Calendar <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </div>

        {/* Foundation Status & Guidelines */}
        <div className="p-6 bg-white border border-slate-200/90 rounded-xl shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Foundation Architecture
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Phase 2 Complete
              </span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900">
              Clean Separation of Concerns
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              FastAPI backend with decoupled repositories, services, schemas, and routers; Next.js 16 frontend with strict TypeScript types, live summary API consumption, and reusable component tokens.
            </p>
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200/80 rounded-lg flex items-start space-x-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-800">
                <span className="font-semibold">Phase 2 Verified:</span> 11 database collections with referential integrity, indexes, pagination, and search APIs are fully active.
              </div>
            </div>
          </div>

          <div className="pt-5 mt-6 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">System Version 1.0.0</span>
            <Link
              href="/settings"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              System Settings
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
