"use client";

import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { ReportFilterBar } from "@/components/reports/ReportFilterBar";
import { FacultyWorkloadReportResponse, FacultyWorkloadItem } from "@/types";
import { reportService, exportService } from "@/services";
import { useToast } from "@/components/Toast";

export default function FacultyWorkloadReportPage() {
  const toast = useToast();
  const [filters, setFilters] = useState<{
    academicYearId?: string;
    semesterTypeId?: string;
    timetableId?: string;
  }>({});
  const [report, setReport] = useState<FacultyWorkloadReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await reportService.getFacultyWorkload(filters);
      setReport(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load faculty workload report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      await exportService.downloadFacultyWorkloadExcel(filters);
      toast.success("Faculty Workload Report exported to Excel successfully");
    } catch (err: any) {
      toast.error("Failed to export Excel report");
    } finally {
      setExporting(false);
    }
  };

  const items = report?.items || [];

  return (
    <AdminLayout>
      <PageHeader
        title="Faculty Workload Report"
        description="Detailed analysis of teaching period allocations, scheduled timetable hours, and maximum workload limits per faculty member."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reports", href: "/reports/faculty-workload" },
          { label: "Faculty Workload" },
        ]}
      />

      <ReportFilterBar
        academicYearId={filters.academicYearId}
        semesterTypeId={filters.semesterTypeId}
        timetableId={filters.timetableId}
        onFilterChange={setFilters}
        onExportExcel={handleExportExcel}
        isExportingExcel={exporting}
      />

      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-slate-500 font-medium">Calculating faculty workload metrics...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            No faculty workload data found.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Ensure an academic year and timetable exist for the selected filters.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500">
            <div>
              <span>Period: <strong>{report?.academicYearName || "Current"}</strong> ({report?.semesterTypeName})</span>
              {report?.timetableVersion && (
                <span className="ml-3">Timetable: <strong>v{report.timetableVersion}</strong> ({report.timetableStatus})</span>
              )}
            </div>
            <span>Total Faculty: <strong>{items.length}</strong></span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-3">Designation</th>
                  <th className="py-3 px-3 text-center">Required (Allocated)</th>
                  <th className="py-3 px-3 text-center">Scheduled (TT)</th>
                  <th className="py-3 px-3 text-center">Max Limit</th>
                  <th className="py-3 px-4 text-center">Utilization</th>
                  <th className="py-3 px-3 text-center">Classes</th>
                  <th className="py-3 px-3 text-center">Subjects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {items.map((row: FacultyWorkloadItem) => {
                  const isOver = row.scheduledHours > row.maxWeeklyHours && row.maxWeeklyHours > 0;
                  const isUnder = row.scheduledHours < (row.requiredAllocationHours ?? row.requiredHours ?? 0);

                  return (
                    <tr key={row.facultyId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {row.facultyName}
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          {row.facultyCode}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{row.designation || "Faculty"}</td>
                      <td className="py-3 px-3 text-center font-mono font-medium">
                        {row.requiredAllocationHours ?? row.requiredHours ?? 0} hrs
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold">
                        <span
                          className={
                            isOver
                              ? "text-rose-600 dark:text-rose-400"
                              : isUnder
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-indigo-600 dark:text-indigo-400"
                          }
                        >
                          {row.scheduledHours} hrs
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {row.maxWeeklyHours} hrs
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isOver
                                  ? "bg-rose-500"
                                  : row.utilizationPercent >= 85
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(row.utilizationPercent, 100)}%` }}
                            />
                          </div>
                          <span
                            className={`font-bold font-mono text-[11px] ${
                              isOver
                                ? "text-rose-600"
                                : row.utilizationPercent >= 85
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {row.utilizationPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">{row.classCount ?? row.classesCount ?? 0}</td>
                      <td className="py-3 px-3 text-center font-mono">{row.subjectCount ?? row.subjectsCount ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
