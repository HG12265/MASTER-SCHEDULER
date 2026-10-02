"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  Calendar,
  RotateCcw,
  FileText,
  Printer,
  FileSpreadsheet,
  Archive,
  Send,
  ShieldCheck,
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
import { timetablePublicationService } from "@/services/timetablePublicationService";
import { exportService } from "@/services/exportService";
import { AcademicYear, SemesterType, Timetable } from "@/types";
import { TimetableStatusBadge, ValidationStatusBadge } from "@/components/timetable/TimetableStatusBadge";
import { PublishConfirmDialog } from "@/components/timetable/PublishConfirmDialog";

export default function TimetablesHistoryPage() {
  const router = useRouter();
  const toast = useToast();

  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesterTypes, setSemesterTypes] = useState<SemesterType[]>([]);

  const [filterYearId, setFilterYearId] = useState<string>("");
  const [filterSemTypeId, setFilterSemTypeId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // Deletion modal state (Only allowed for DRAFT)
  const [deleteTarget, setDeleteTarget] = useState<Timetable | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Publish modal state
  const [publishTarget, setPublishTarget] = useState<Timetable | null>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

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
        status: filterStatus || undefined,
      });
      setTimetables(data);
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Failed to load timetables", "error");
    } finally {
      setLoading(false);
    }
  }, [filterYearId, filterSemTypeId, filterStatus, toast]);

  useEffect(() => {
    loadTimetables();
  }, [loadTimetables]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await timetablesService.delete(deleteTarget.id);
      toast.showToast(`Draft timetable (v${deleteTarget.version}) deleted successfully`, "success");
      setDeleteTarget(null);
      await loadTimetables();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Failed to delete timetable", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePublish = async () => {
    if (!publishTarget) return;
    try {
      setIsPublishing(true);
      await timetablePublicationService.publish(publishTarget.id);
      toast.showToast(`Timetable (v${publishTarget.version}) published officially!`, "success");
      setPublishTarget(null);
      await loadTimetables();
    } catch (err: any) {
      toast.showToast(err?.response?.data?.message || "Publish validation failed", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReturnToDraft = async (tt: Timetable) => {
    try {
      await timetablePublicationService.returnToDraft(tt.id);
      toast.showToast(`Timetable (v${tt.version}) returned to DRAFT`, "success");
      await loadTimetables();
    } catch (err: any) {
      toast.showToast(err?.response?.data?.message || "Failed to return to draft", "error");
    }
  };

  const handleArchive = async (tt: Timetable) => {
    try {
      await timetablePublicationService.archive(tt.id);
      toast.showToast(`Timetable (v${tt.version}) archived`, "success");
      await loadTimetables();
    } catch (err: any) {
      toast.showToast(err?.response?.data?.message || "Failed to archive", "error");
    }
  };

  const handleCreateDraftCopy = async (tt: Timetable) => {
    try {
      const res = await timetablePublicationService.createDraftCopy(tt.id);
      toast.showToast("Created new editable draft version!", "success");
      router.push(`/timetables/${res.data.id}`);
    } catch (err: any) {
      toast.showToast(err?.response?.data?.message || "Failed to create draft copy", "error");
    }
  };

  const handleDownloadPdf = async (tt: Timetable) => {
    try {
      toast.showToast("Preparing Official Master PDF...", "info");
      await exportService.downloadTimetablePdf(tt.id, { view: "master" });
      toast.showToast("PDF downloaded successfully", "success");
    } catch (err: any) {
      toast.showToast(err?.response?.data?.message || "Failed to export PDF", "error");
    }
  };

  const handleDownloadExcel = async (tt: Timetable) => {
    try {
      toast.showToast("Preparing Master Excel Workbook...", "info");
      await exportService.downloadTimetableExcel(tt.id, { view: "master" });
      toast.showToast("Excel downloaded successfully", "success");
    } catch (err: any) {
      toast.showToast(err?.response?.data?.message || "Failed to export Excel", "error");
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Generated Timetables"
        description="Official publication workflow, immutability protection, and export history for academic timetables."
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
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Academic Year
              </span>
            </label>
            <select
              value={filterYearId}
              onChange={(e) => setFilterYearId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                Semester Type
              </span>
            </label>
            <select
              value={filterSemTypeId}
              onChange={(e) => setFilterSemTypeId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Semester Types</option>
              {semesterTypes.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                Publication Status
              </span>
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="READY_FOR_APPROVAL">Ready for Approval</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 w-full text-center">
              Total Found: <strong className="text-slate-800 dark:text-slate-200">{timetables.length}</strong> record(s)
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
            const isDraft = tt.status === "DRAFT";
            const isReady = tt.status === "READY_FOR_APPROVAL";
            const isPublished = tt.status === "PUBLISHED";
            const isArchived = tt.status === "ARCHIVED";

            return (
              <div
                key={tt.id}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {tt.name || `Timetable v${tt.version}`}
                      </span>

                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        v{tt.version}
                      </span>

                      {/* Status badge */}
                      <TimetableStatusBadge status={tt.status} size="sm" />

                      {/* Validation status badge */}
                      <ValidationStatusBadge status={tt.validationStatus} size="sm" />
                    </div>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
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
                          {new Date(tt.generatedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {tt.publishedAt && (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Published: {new Date(tt.publishedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle: Summary Stats */}
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {tt.stats?.totalClasses ?? tt.classIds?.length ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-400">Classes</div>
                    </div>

                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                      <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                        {tt.stats?.totalScheduledSubjectPeriods ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-400">Scheduled</div>
                    </div>

                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                      <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
                        {tt.stats?.totalFixedPeriods ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-400">Fixed</div>
                    </div>
                  </div>

                  {/* Right: Actions tailored by Status */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* View Timetable Button */}
                    <Link
                      href={`/timetables/${tt.id}`}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View
                    </Link>

                    {/* DRAFT Actions */}
                    {isDraft && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(tt)}
                        className="inline-flex items-center p-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                        title="Delete draft version"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* READY_FOR_APPROVAL Actions */}
                    {isReady && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleReturnToDraft(tt)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
                          title="Return to Draft"
                        >
                          Return to Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => setPublishTarget(tt)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                          title="Publish Timetable"
                        >
                          Publish
                        </button>
                      </>
                    )}

                    {/* PUBLISHED Actions */}
                    {isPublished && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(tt)}
                          className="p-1.5 text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-100 transition-colors"
                          title="Export PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadExcel(tt)}
                          className="p-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors"
                          title="Export Excel"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                        <Link
                          href={`/timetables/${tt.id}/print`}
                          className="p-1.5 text-slate-600 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                          title="Print View"
                        >
                          <Printer className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleCreateDraftCopy(tt)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition-colors"
                          title="Create New Draft Copy"
                        >
                          New Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(tt)}
                          className="p-1.5 text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* ARCHIVED Actions */}
                    {isArchived && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(tt)}
                          className="p-1.5 text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                          title="Export PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadExcel(tt)}
                          className="p-1.5 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                          title="Export Excel"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal (Drafts only) */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title={`Delete Draft Timetable (v${deleteTarget?.version})`}
        message={`Are you sure you want to delete this draft timetable for "${deleteTarget?.academicYearName} - ${deleteTarget?.semesterTypeName}"? All associated draft entries will be permanently removed.`}
        confirmText={isDeleting ? "Deleting..." : "Delete Timetable"}
        cancelText="Keep Version"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Publish Confirmation Modal */}
      <PublishConfirmDialog
        isOpen={Boolean(publishTarget)}
        onClose={() => setPublishTarget(null)}
        onConfirm={handlePublish}
        isLoading={isPublishing}
        timetableVersion={publishTarget?.version}
      />
    </AdminLayout>
  );
}
