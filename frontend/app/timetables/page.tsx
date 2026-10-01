"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  Calendar,
  School,
  FileCheck2,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { academicYearsService } from "@/services/academicYears";
import { semesterTypesService } from "@/services/semesterTypes";
import { timetablesService } from "@/services/timetables";
import { AcademicYear, SemesterType, Timetable } from "@/types";

export default function TimetablesHistoryPage() {
  const router = useRouter();
  const toast = useToast();

  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesterTypes, setSemesterTypes] = useState<SemesterType[]>([]);

  const [filterYearId, setFilterYearId] = useState<string>("");
  const [filterSemTypeId, setFilterSemTypeId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<Timetable | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Load masters & initial timetables
  useEffect(() => {
    async function loadMasters() {
      try {
        const [ays, sts] = await Promise.all([
          academicYearsService.getAll(),
          semesterTypesService.getAll(),
        ]);
        setAcademicYears(ays || []);
        setSemesterTypes(sts || []);
      } catch (err: unknown) {
        toast.showToast(err instanceof Error ? err.message : "Failed to load master filters", "error");
      }
    }
    loadMasters();
  }, [toast]);

  const loadTimetables = useCallback(async () => {
    try {
      setLoading(true);
      const data = await timetablesService.getAll({
        academicYearId: filterYearId || undefined,
        semesterTypeId: filterSemTypeId || undefined,
      });
      setTimetables(data);
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Failed to load timetables", "error");
    } finally {
      setLoading(false);
    }
  }, [filterYearId, filterSemTypeId, toast]);

  useEffect(() => {
    loadTimetables();
  }, [loadTimetables]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await timetablesService.delete(deleteTarget.id);
      toast.showToast(`Timetable version ${deleteTarget.version} deleted successfully`, "success");
      setDeleteTarget(null);
      await loadTimetables();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Failed to delete timetable", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Generated Timetables"
        description="Version-controlled academic schedules synthesized via Google OR-Tools CP-SAT constraint programming."
        breadcrumbs={[{ label: "Timetables & Views" }, { label: "History" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadTimetables}
              className="inline-flex items-center px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/scheduler"
              className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Generate New Timetable
            </Link>
          </div>
        }
      />

      {/* Filters Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Filter Academic Year
              </span>
            </label>
            <select
              value={filterYearId}
              onChange={(e) => setFilterYearId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Academic Years</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.isCurrent ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                Filter Semester Type
              </span>
            </label>
            <select
              value={filterSemTypeId}
              onChange={(e) => setFilterSemTypeId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Semester Types</option>
              {semesterTypes.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200 w-full">
              Showing <span className="font-bold text-slate-800">{timetables.length}</span> generated version(s)
            </div>
          </div>
        </div>
      </div>

      {/* Timetable List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs">
          Loading timetable versions...
        </div>
      ) : timetables.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="w-8 h-8 text-indigo-600" />}
          title="No Timetables Found"
          description="No timetable versions match the selected filters. Use the Scheduler engine to generate an optimal timetable."
          action={{
            label: "Generate Timetable",
            onClick: () => router.push("/scheduler"),
          }}
        />
      ) : (
        <div className="space-y-4">
          {timetables.map((tt) => {
            const isOptimal = tt.solverStatus === "OPTIMAL";
            const isFeasible = tt.solverStatus === "FEASIBLE";
            const isDraft = tt.status === "DRAFT";
            const isPublished = tt.status === "PUBLISHED";

            return (
              <div
                key={tt.id}
                className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-indigo-300 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-slate-900">
                        {tt.name || `Timetable v${tt.version}`}
                      </span>

                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        v{tt.version}
                      </span>

                      {/* Status badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          isPublished
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : isDraft
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-slate-100 text-slate-700 border border-slate-300"
                        }`}
                      >
                        {tt.status}
                      </span>

                      {/* Solver status badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                          isOptimal
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isFeasible
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {isOptimal && <CheckCircle2 className="w-3 h-3" />}
                        {isFeasible && <AlertTriangle className="w-3 h-3" />}
                        CP-SAT {tt.solverStatus}
                      </span>
                    </div>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tt.academicYearName || "Academic Year"}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tt.semesterTypeName || "Semester Type"}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(tt.generatedAt).toLocaleString()} ({tt.generationDurationMs} ms)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Summary Stats */}
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-center">
                      <div className="text-xs font-bold text-slate-800">
                        {tt.stats?.totalClasses ?? tt.classIds?.length ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-400">Classes</div>
                    </div>

                    <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-center">
                      <div className="text-xs font-bold text-indigo-700">
                        {tt.stats?.totalScheduledSubjectPeriods ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-400">Scheduled Periods</div>
                    </div>

                    <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-center">
                      <div className="text-xs font-bold text-amber-700">
                        {tt.stats?.totalFixedPeriods ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-400">Fixed Periods</div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/timetables/${tt.id}`}
                      className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      View Timetable
                    </Link>

                    {isDraft && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(tt)}
                        className="inline-flex items-center p-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                        title="Delete draft version"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title={`Delete Draft Timetable (v${deleteTarget?.version})`}
        message={`Are you sure you want to delete this draft timetable for "${deleteTarget?.academicYearName} - ${deleteTarget?.semesterTypeName}"? All associated scheduled entries will be removed.`}
        confirmText={isDeleting ? "Deleting..." : "Delete Timetable"}
        cancelText="Keep Version"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}
