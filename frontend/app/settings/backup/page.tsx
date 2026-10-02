"use client";

import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { backupService } from "@/services";
import {
  BackupHistoryItem,
  BackupPreviewResponse,
  BackupValidationResult,
} from "@/types";
import { useToast } from "@/components/Toast";
import {
  Database,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileArchive,
  RefreshCw,
  Clock,
  Layers,
} from "lucide-react";

export default function BackupRestorePage() {
  const toast = useToast();
  const [history, setHistory] = useState<BackupHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Restore State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<BackupPreviewResponse | null>(null);
  const [validating, setValidating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmAck, setConfirmAck] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await backupService.getHistory();
      setHistory(data);
    } catch (err: any) {
      // Non-fatal if history is empty
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await backupService.exportBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `master_scheduler_backup_${timestamp}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Backup archive downloaded successfully!");
      fetchHistory();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to export backup");
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      toast.error("Please upload a valid .zip backup archive");
      return;
    }
    setSelectedFile(file);
    setPreviewData(null);
    setConfirmAck(false);

    try {
      setValidating(true);
      const preview = await backupService.previewRestore(file);
      setPreviewData(preview);
      if (!preview.canRestore) {
        toast.error("Backup file validation failed. Review errors below.");
      } else {
        toast.info("Backup archive inspected. Review restore preview.");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to validate backup archive");
    } finally {
      setValidating(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!selectedFile || !previewData?.canRestore) return;
    if (!confirmAck) {
      toast.error("Please confirm acknowledgment before restoring data.");
      return;
    }

    try {
      setRestoring(true);
      await backupService.restoreBackup(selectedFile, true);
      toast.success("Backup successfully restored! Academic data updated.");
      setSelectedFile(null);
      setPreviewData(null);
      setConfirmAck(false);
      fetchHistory();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to restore backup");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <PermissionGuard
      requiredRoles={["SUPER_ADMIN"]}
      fallback={
        <AdminLayout>
          <div className="p-8 text-center text-slate-500">
            Access denied. System Backup and Restore is restricted to Super Administrators.
          </div>
        </AdminLayout>
      }
    >
      <AdminLayout>
        <PageHeader
          title="Backup Export & Safe Restore"
          description="Create encrypted-ready versioned ZIP backups of all academic data, or safely restore from an archive with non-destructive validation and change preview."
          breadcrumbs={[
            { label: "Settings", href: "/settings/system" },
            { label: "Backup & Restore" },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* EXPORT BACKUP CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 text-indigo-600 mb-2">
                <Download className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Export Database Snapshot
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Generates a complete ZIP archive containing sanitized JSON records for all master data, constraints, allocations, published timetables, operations, and audit logs with an embedded integrity manifest.
              </p>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 space-y-1 mb-4">
                <div>✓ Versioned backup schema with manifest metadata</div>
                <div>✓ Excludes sensitive plaintext passwords and credentials</div>
                <div>✓ Suitable for off-site backup or migration</div>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${exporting ? "animate-bounce" : ""}`} />
              {exporting ? "Generating ZIP Archive..." : "Download System Backup (ZIP)"}
            </button>
          </div>

          {/* SAFE RESTORE CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 text-emerald-600 mb-2">
                <Upload className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Safe Restore from Archive
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Upload a verified backup ZIP file. The system validates the schema, verifies collections, and previews records before applying changes.
              </p>

              <div className="mb-4">
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300 hover:file:bg-slate-200 cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3"
                />
              </div>

              {validating && (
                <div className="text-xs text-slate-500 py-3 text-center">
                  <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin mx-auto mb-1" />
                  Inspecting backup archive and calculating changes...
                </div>
              )}
            </div>

            {previewData && (
              <div className="space-y-3">
                <div
                  className={`p-3 rounded-lg border text-xs ${
                    previewData.canRestore
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300"
                      : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-300"
                  }`}
                >
                  <div className="font-bold">
                    {previewData.canRestore
                      ? "Validation Succeeded: Ready to Restore"
                      : "Validation Failed"}
                  </div>
                  <div className="text-[11px] mt-0.5">
                    Records to insert: <strong>{previewData.recordsToAdd}</strong> | Records to update: <strong>{previewData.recordsToUpdate}</strong>
                  </div>
                </div>

                {previewData.canRestore && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmAck}
                        onChange={(e) => setConfirmAck(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>I understand that existing records with matching IDs will be updated.</span>
                    </label>

                    <button
                      onClick={handleExecuteRestore}
                      disabled={!confirmAck || restoring}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {restoring ? "Restoring Data..." : "Execute Safe Restore"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* BACKUP HISTORY TABLE */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                Backup Audit History
              </h3>
              <p className="text-[11px] text-slate-500">
                Log of past backup archives generated or restored in this environment
              </p>
            </div>
            <button
              onClick={fetchHistory}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
              title="Refresh history"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Initiated By</th>
                  <th className="py-3 px-3 text-center">Collections</th>
                  <th className="py-3 px-3 text-center">Total Records</th>
                  <th className="py-3 px-4 text-right">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Loading backup log...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No backup operations logged yet.
                    </td>
                  </tr>
                ) : (
                  history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileArchive className="w-4 h-4 text-indigo-500" />
                        {h.filename}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {new Date(h.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                        {h.createdBy || "Administrator"}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        {h.collectionCount}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-indigo-600">
                        {h.recordCount}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                        {h.fileSizeBytes ? `${(h.fileSizeBytes / 1024).toFixed(1)} KB` : "-"}
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
