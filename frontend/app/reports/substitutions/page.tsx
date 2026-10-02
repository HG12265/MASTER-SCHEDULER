"use client";

import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { reportService, facultyService } from "@/services";
import {
  SubstitutionReport,
  FacultyOperationalWorkloadReport,
  Faculty,
} from "@/types";
import { useToast } from "@/components/Toast";
import {
  FileText,
  Users,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Briefcase,
  TrendingUp,
} from "lucide-react";

export default function OperationalReportsPage() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"SUBSTITUTIONS" | "WORKLOAD">("SUBSTITUTIONS");

  // Date Range Defaults: past 30 days to today
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("ALL");
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);

  // Report Data
  const [subReport, setSubReport] = useState<SubstitutionReport | null>(null);
  const [workloadReport, setWorkloadReport] = useState<FacultyOperationalWorkloadReport | null>(null);
  const [loading, setLoading] = useState(true);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const loadFaculty = async () => {
    try {
      const fRes = await facultyService.getAll();
      const fList = Array.isArray(fRes) ? fRes : ((fRes as any)?.data || []);
      setFacultyList(fList);
    } catch {
      // Non-fatal
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {
        startDate,
        endDate,
        facultyId: selectedFacultyId !== "ALL" ? selectedFacultyId : undefined,
      };

      if (activeTab === "SUBSTITUTIONS") {
        const data = await reportService.getSubstitutions(params);
        setSubReport(data);
      } else {
        const data = await reportService.getOperationalWorkload(params);
        setWorkloadReport(data);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaculty();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [activeTab, startDate, endDate, selectedFacultyId]);

  return (
    <PermissionGuard
      requiredRoles={["SUPER_ADMIN", "ADMIN", "HOD", "VIEWER"]}
      fallback={
        <AdminLayout>
          <div className="p-8 text-center text-slate-500">
            Access denied to operational reports.
          </div>
        </AdminLayout>
      }
    >
      <AdminLayout>
        <PageHeader
          title="Operational Reports & Workload Analytics"
          description="Analyze historical temporary substitutions, coverage rates, and operational workload delivered across all departments."
          breadcrumbs={[
            { label: "Reports", href: "/reports/faculty-workload" },
            { label: "Operational Substitutions & Workload" },
          ]}
        />

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 mb-6">
          <button
            onClick={() => setActiveTab("SUBSTITUTIONS")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "SUBSTITUTIONS"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Users className="w-4 h-4" />
            Substitution Activity Log
          </button>

          <button
            onClick={() => setActiveTab("WORKLOAD")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "WORKLOAD"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Faculty Operational Workload
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-medium"
              />
            </div>

            <select
              value={selectedFacultyId}
              onChange={(e) => setSelectedFacultyId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-medium max-w-xs truncate"
            >
              <option value="ALL">All Faculty Members</option>
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.facultyCode || f.designation || "Faculty"})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search report table..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>

            <button
              onClick={fetchReports}
              className="p-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs"
              title="Refresh Report"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* TAB 1: SUBSTITUTIONS LOG */}
        {activeTab === "SUBSTITUTIONS" && (
          <div>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="text-slate-500 text-[11px] font-medium uppercase">
                  Total Recorded Substitutions
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {subReport?.totalSubstitutions ?? 0}
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="text-emerald-600 text-[11px] font-medium uppercase">
                  Assigned / Covered
                </div>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  {subReport?.assignedCount ?? 0}
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="text-slate-400 text-[11px] font-medium uppercase">
                  Cancelled / Free Periods
                </div>
                <div className="text-2xl font-black text-slate-500 mt-1">
                  {subReport?.cancelledCount ?? 0}
                </div>
              </div>
            </div>

            {/* Substitutions Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Date & Slot</th>
                      <th className="py-3 px-3">Class</th>
                      <th className="py-3 px-3">Subject</th>
                      <th className="py-3 px-3">Absent Faculty</th>
                      <th className="py-3 px-3">Substitute Faculty</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-400">
                          Generating substitution report...
                        </td>
                      </tr>
                    ) : !subReport || subReport.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-400">
                          No substitution records found for the selected period.
                        </td>
                      </tr>
                    ) : (
                      subReport.items
                        .filter((item) => {
                          if (!searchQuery.trim()) return true;
                          const q = searchQuery.toLowerCase();
                          return (
                            item.absentFacultyName?.toLowerCase().includes(q) ||
                            item.substituteFacultyName?.toLowerCase().includes(q) ||
                            item.className?.toLowerCase().includes(q) ||
                            item.subjectName?.toLowerCase().includes(q)
                          );
                        })
                        .map((item) => (
                          <tr
                            key={item.substitutionId}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                              {item.date}
                              <div className="text-[10px] text-slate-400 font-normal">
                                {item.timeSlotName}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                              {item.className}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {item.subjectName}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {item.subjectCode}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="line-through text-slate-400">
                                {item.absentFacultyName}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {item.substituteFacultyName ? (
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                  {item.substituteFacultyName}
                                </span>
                              ) : item.assignmentType === "CANCELLED" ? (
                                <span className="text-amber-600 font-medium">Free Period</span>
                              ) : (
                                <span className="text-slate-400 italic">None</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.status === "ASSIGNED"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : item.status === "CANCELLED"
                                    ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FACULTY OPERATIONAL WORKLOAD */}
        {activeTab === "WORKLOAD" && (
          <div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Faculty Member</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3 text-center">Regular Scheduled Periods</th>
                      <th className="py-3 px-3 text-center">Substitute Periods Delivered</th>
                      <th className="py-3 px-3 text-center">Total Operational Workload</th>
                      <th className="py-3 px-4 text-center">Leave Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-400">
                          Calculating operational workload...
                        </td>
                      </tr>
                    ) : !workloadReport || workloadReport.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-400">
                          No workload data found for the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      workloadReport.items
                        .filter((item) => {
                          if (!searchQuery.trim()) return true;
                          const q = searchQuery.toLowerCase();
                          return (
                            item.facultyName?.toLowerCase().includes(q) ||
                            item.department?.toLowerCase().includes(q)
                          );
                        })
                        .map((item) => (
                          <tr
                            key={item.facultyId}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                              {item.facultyName}
                              <div className="text-[10px] text-slate-400 font-mono">
                                {item.facultyCode || item.designation || "Faculty"}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-medium">
                              {item.department || "General"}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-semibold">
                              {item.regularScheduledPeriods}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              +{item.substitutePeriods}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/30">
                              {item.totalOperationalPeriods}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-amber-600 font-semibold">
                              {item.approvedLeaveDays} d
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </PermissionGuard>
  );
}
