"use client";

import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { ReportFilterBar } from "@/components/reports/ReportFilterBar";
import { SubjectCoverageReportResponse, SubjectCoverageItem } from "@/types";
import { reportService, exportService } from "@/services";
import { useToast } from "@/components/Toast";

export default function SubjectCoverageReportPage() {
  const toast = useToast();
  const [filters, setFilters] = useState<{
    academicYearId?: string;
    semesterTypeId?: string;
    timetableId?: string;
  }>({});
  const [report, setReport] = useState<SubjectCoverageReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await reportService.getSubjectCoverage(filters);
      setReport(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load subject coverage report");
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
      await exportService.downloadSubjectCoverageExcel(filters);
      toast.success("Subject Coverage Report exported to Excel successfully");
    } catch (err: any) {
      toast.error("Failed to export Excel report");
    } finally {
      setExporting(false);
    }
  };

  const items = report?.items || [];

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "COMPLETE") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Complete
        </span>
      );
    }
    if (s === "SHORTAGE") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Shortage
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Over Scheduled
      </span>
    );
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Subject Coverage Report"
        description="Verify syllabus hour requirements against scheduled timetable periods for every class and subject."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reports", href: "/reports/subject-coverage" },
          { label: "Subject Coverage" },
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
          <p className="text-sm text-slate-500 font-medium">Auditing syllabus coverage...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            No subject coverage records found.
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
            <span>Total Subjects Tracked: <strong>{items.length}</strong></span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-3 text-center">Required Hours</th>
                  <th className="py-3 px-3 text-center">Scheduled Hours</th>
                  <th className="py-3 px-3 text-center">Remaining</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {items.map((row: SubjectCoverageItem, idx: number) => (
                  <tr key={`${row.classId}-${row.subjectId}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {row.className}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {row.subjectName}
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">
                        {row.subjectCode}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-medium">
                      {row.requiredWeeklyHours} hrs
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      {row.scheduledWeeklyHours} hrs
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span
                        className={
                          row.remainingHours > 0
                            ? "text-rose-600 font-bold"
                            : row.remainingHours < 0
                            ? "text-amber-600 font-bold"
                            : "text-slate-400"
                        }
                      >
                        {row.remainingHours > 0 ? `-${row.remainingHours}` : row.remainingHours < 0 ? `+${Math.abs(row.remainingHours)}` : "0"} hrs
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(row.coverageStatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
