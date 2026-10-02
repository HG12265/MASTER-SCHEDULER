"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { systemSettingsService, integrityService } from "@/services";
import { SystemSettings, IntegrityCheckResult } from "@/types";
import { useToast } from "@/components/Toast";
import {
  Settings,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Save,
  Users,
  Database,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function SystemSettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Integrity Check State
  const [integrityRunning, setIntegrityRunning] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<IntegrityCheckResult | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await systemSettingsService.getSettings();
      setSettings(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load system settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setSaving(true);
      const updated = await systemSettingsService.updateSettings(settings);
      setSettings(updated);
      toast.success("System settings updated successfully!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update system settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRunIntegrityCheck = async () => {
    try {
      setIntegrityRunning(true);
      const res = await integrityService.runIntegrityCheck();
      setIntegrityResult(res);
      if (res.passed) {
        toast.success("Integrity Diagnostic Passed: Zero integrity violations found!");
      } else {
        toast.info(
          `Integrity Diagnostic completed with ${res.errorCount} error(s) and ${res.warningCount} warning(s).`
        );
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to run database integrity diagnostic");
    } finally {
      setIntegrityRunning(false);
    }
  };

  return (
    <PermissionGuard
      requiredRoles={["SUPER_ADMIN", "ADMIN"]}
      fallback={
        <AdminLayout>
          <div className="p-8 text-center text-slate-500">
            Access denied. System settings are restricted to Administrators.
          </div>
        </AdminLayout>
      }
    >
      <AdminLayout>
        <PageHeader
          title="System Settings & Database Diagnostics"
          description="Manage global operational preferences, substitution policies, and run referential integrity checks across academic data."
          breadcrumbs={[
            { label: "Settings", href: "/settings/users" },
            { label: "System & Diagnostics" },
          ]}
        />

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <Link
            href="/settings/users"
            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                  User Accounts & RBAC
                </h4>
                <p className="text-[11px] text-slate-500">
                  Manage administrator, HOD, and faculty user credentials and roles.
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </Link>

          <Link
            href="/settings/backup"
            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-400 dark:hover:border-emerald-600 transition-all flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                  Backup Export & Safe Restore
                </h4>
                <p className="text-[11px] text-slate-500">
                  Full versioned ZIP archive export and non-destructive validation restore.
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </Link>
        </div>

        {/* Global Settings Form */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs mb-6 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-600" />
                Global System Configuration
              </h3>
              <p className="text-[11px] text-slate-500">
                Regional timezone, display preferences, and substitution engine behavior
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Loading configuration...
            </div>
          ) : settings ? (
            <form onSubmit={handleSaveSettings} className="p-5 space-y-5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    System Timezone
                  </label>
                  <select
                    value={settings.defaultTimezone}
                    onChange={(e) =>
                      setSettings({ ...settings, defaultTimezone: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT - UTC+08:00)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST - UTC+04:00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Date Format
                  </label>
                  <select
                    value={settings.dateFormat}
                    onChange={(e) =>
                      setSettings({ ...settings, dateFormat: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Time Format
                  </label>
                  <select
                    value={settings.timeFormat}
                    onChange={(e) =>
                      setSettings({ ...settings, timeFormat: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="12h">12-Hour (e.g. 09:30 AM)</option>
                    <option value="24h">24-Hour (e.g. 09:30)</option>
                  </select>
                </div>
              </div>

              {/* Substitution Policy Flags */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                  Operational & Substitution Policies
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.substitutionPolicies?.prioritizeSameSubject ?? true}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          substitutionPolicies: {
                            ...settings.substitutionPolicies,
                            prioritizeSameSubject: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Prioritize faculty allocated to the same subject (+50 match score)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.substitutionPolicies?.requireApprovalForLeave ?? true}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          substitutionPolicies: {
                            ...settings.substitutionPolicies,
                            requireApprovalForLeave: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Require administrative approval for faculty leave requests</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.substitutionPolicies?.autoNotifySubstitutes ?? true}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          substitutionPolicies: {
                            ...settings.substitutionPolicies,
                            autoNotifySubstitutes: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Send in-app notification when substitute faculty is assigned</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.substitutionPolicies?.allowOvertimeSubstitutes ?? false}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          substitutionPolicies: {
                            ...settings.substitutionPolicies,
                            allowOvertimeSubstitutes: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Allow substitute assignment even if faculty reaches daily session limit</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Saving..." : "Save System Settings"}
                </button>
              </div>
            </form>
          ) : null}
        </div>

        {/* Database Referential Integrity Diagnostic Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
                Database Integrity Diagnostic
              </h3>
              <p className="text-[11px] text-slate-500">
                Inspect cross-collection relations, orphan timetable entries, broken allocations, and published timetable completeness.
              </p>
            </div>

            <button
              onClick={handleRunIntegrityCheck}
              disabled={integrityRunning}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${integrityRunning ? "animate-spin" : ""}`} />
              {integrityRunning ? "Running Diagnostics..." : "Run Integrity Diagnostic"}
            </button>
          </div>

          {integrityResult && (
            <div className="p-5 space-y-4 text-xs">
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  integrityResult.passed
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200"
                    : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {integrityResult.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-xs">
                      {integrityResult.passed
                        ? "Integrity Check Passed"
                        : "Integrity Issues Detected"}
                    </div>
                    <div className="text-[11px] opacity-80">
                      Checked at {new Date(integrityResult.checkedAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono font-bold">
                  <span className="text-rose-600">{integrityResult.errorCount} Errors</span>
                  <span className="text-amber-600">{integrityResult.warningCount} Warnings</span>
                  <span className="text-blue-600">{integrityResult.infoCount} Info</span>
                </div>
              </div>

              {integrityResult.issues.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  All master data and timetable records adhere to referential integrity constraints.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {integrityResult.issues.map((iss, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              iss.severity === "ERROR"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : iss.severity === "WARNING"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            }`}
                          >
                            {iss.severity}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {iss.category} ({iss.entityType})
                          </span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 text-xs mt-1">
                          {iss.description}
                        </div>
                        {iss.suggestedFix && (
                          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                            💡 Fix: {iss.suggestedFix}
                          </div>
                        )}
                      </div>

                      {iss.entityIdentifier && (
                        <span className="font-mono text-[10px] text-slate-400 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                          {iss.entityIdentifier}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </AdminLayout>
    </PermissionGuard>
  );
}
