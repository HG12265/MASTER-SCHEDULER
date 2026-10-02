"use client";

import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { ReportFilterBar } from "@/components/reports/ReportFilterBar";
import { ResourceUtilizationReportResponse, ResourceUtilizationItem } from "@/types";
import { reportService, exportService } from "@/services";
import { useToast } from "@/components/Toast";

export default function ResourceUtilizationReportPage() {
  const toast = useToast();
  const [filters, setFilters] = useState<{
    academicYearId?: string;
    semesterTypeId?: string;
    timetableId?: string;
    resourceType?: string;
  }>({});
  const [report, setReport] = useState<ResourceUtilizationReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await reportService.getResourceUtilization(filters);
      setReport(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load resource utilization report");
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
      await exportService.downloadResourceUtilizationExcel(filters);
      toast.success("Resource Utilization Report exported to Excel successfully");
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
        title="Room & Lab Utilization Report"
        description="Monitor physical classroom and laboratory capacity usage across configured teaching periods."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reports", href: "/reports/resource-utilization" },
          { label: "Resource Utilization" },
        ]}
      />

      <ReportFilterBar
        academicYearId={filters.academicYearId}
        semesterTypeId={filters.semesterTypeId}
        timetableId={filters.timetableId}
        onFilterChange={(f) => setFilters((prev) => ({ ...prev, ...f }))}
        onExportExcel={handleExportExcel}
        isExportingExcel={exporting}
      />

      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-slate-500 font-medium">Analyzing room and lab usage...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            No resource utilization data found.
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
            <span>Total Facilities: <strong>{items.length}</strong></span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Resource Facility</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-center">Available Teaching Slots</th>
                  <th className="py-3 px-3 text-center">Used Slots</th>
                  <th className="py-3 px-4 text-center">Utilization</th>
                  <th className="py-3 px-3 text-center">Assigned Classes</th>
                  <th className="py-3 px-3 text-center">Assigned Subjects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {items.map((row: ResourceUtilizationItem) => {
                  const isLab = (row.resourceType || "").toUpperCase() === "LAB";
                  return (
                    <tr key={row.resourceId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {row.resourceName}
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          {row.resourceCode}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${
                            isLab
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                          }`}
                        >
                          {row.resourceType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-medium">
                        {row.availableTeachingSlots ?? row.availableSlots ?? 0} slots
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {row.usedSlots} slots
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isLab ? "bg-purple-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${Math.min(row.utilizationPercent, 100)}%` }}
                            />
                          </div>
                          <span className="font-bold font-mono text-[11px] text-slate-800 dark:text-slate-200">
                            {row.utilizationPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">{row.classCount ?? row.classesUsing?.length ?? 0}</td>
                      <td className="py-3 px-3 text-center font-mono">{row.subjectCount ?? row.subjectsUsing?.length ?? 0}</td>
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
