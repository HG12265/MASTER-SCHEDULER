"use client";

import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { InstitutionSettings } from "@/types";
import { institutionSettingsService } from "@/services";
import { OfficialTimetableHeader } from "@/components/timetable/OfficialTimetableHeader";

export default function InstitutionSettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<InstitutionSettings>({
    institutionName: "",
    departmentName: "",
    addressLine1: "",
    addressLine2: "",
    academicTitle: "Official Academic Timetable",
    principalName: "",
    hodName: "",
    preparedByLabel: "Prepared By",
    approvedByLabel: "Approved By",
    footerText: "Computer Generated Official Timetable",
    logoPath: "",
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await institutionSettingsService.get();
        if (data) {
          setFormData(data);
        }
      } catch (err: any) {
        toast.error("Failed to load institution settings");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await institutionSettingsService.update(formData);
      setFormData(updated);
      toast.success("Official institution header settings updated successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update institution settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Official Institution Settings"
        description="Configure institutional branding and signature headings used in official timetable exports and reports."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings", href: "/settings" },
          { label: "Institution" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        {/* Settings Form */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-5"
          >
            <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Institution Header Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Institution / University Name *
                </label>
                <input
                  type="text"
                  name="institutionName"
                  value={formData.institutionName || ""}
                  onChange={handleChange}
                  required
                  placeholder="e.g., St. Joseph's Institute of Technology"
                  className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  name="departmentName"
                  value={formData.departmentName || ""}
                  onChange={handleChange}
                  placeholder="e.g., Department of Computer Science & Engineering"
                  className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    name="addressLine1"
                    value={formData.addressLine1 || ""}
                    onChange={handleChange}
                    placeholder="e.g., OMR, Semmancheri"
                    className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    name="addressLine2"
                    value={formData.addressLine2 || ""}
                    onChange={handleChange}
                    placeholder="e.g., Chennai, Tamil Nadu - 600119"
                    className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Academic Header Title
                </label>
                <input
                  type="text"
                  name="academicTitle"
                  value={formData.academicTitle || ""}
                  onChange={handleChange}
                  placeholder="e.g., Official Academic Timetable"
                  className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Head of Department (HOD) Name
                  </label>
                  <input
                    type="text"
                    name="hodName"
                    value={formData.hodName || ""}
                    onChange={handleChange}
                    placeholder="e.g., Dr. A. Sharma"
                    className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Principal / Director Name
                  </label>
                  <input
                    type="text"
                    name="principalName"
                    value={formData.principalName || ""}
                    onChange={handleChange}
                    placeholder="e.g., Dr. P. Raman"
                    className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Prepared By Label
                  </label>
                  <input
                    type="text"
                    name="preparedByLabel"
                    value={formData.preparedByLabel || ""}
                    onChange={handleChange}
                    placeholder="e.g., Timetable Coordinator"
                    className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Approved By Label
                  </label>
                  <input
                    type="text"
                    name="approvedByLabel"
                    value={formData.approvedByLabel || ""}
                    onChange={handleChange}
                    placeholder="e.g., Principal / Dean"
                    className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Footer Notice / Disclaimer
                </label>
                <input
                  type="text"
                  name="footerText"
                  value={formData.footerText || ""}
                  onChange={handleChange}
                  placeholder="e.g., Computer Generated Timetable. Subject to official approval."
                  className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Institution Logo URL / Reference
                </label>
                <input
                  type="text"
                  name="logoPath"
                  value={formData.logoPath || formData.logoUrl || ""}
                  onChange={handleChange}
                  placeholder="e.g., /logo.png or https://example.com/logo.png"
                  className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Optional. If left blank, PDF and Excel generators cleanly render text headers without a logo.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {saving ? "Saving Configuration..." : "Save Settings"}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Official Document Header Preview
            </h3>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <OfficialTimetableHeader
                settings={formData}
                academicYearName="2026-2027"
                semesterTypeName="ODD"
                targetName="MCA Semester I"
                version={1}
                status="PUBLISHED"
              />

              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between text-[11px] text-slate-500">
                <div className="text-center">
                  <div className="h-6" />
                  <p className="border-t border-slate-300 pt-1 font-semibold">{formData.preparedByLabel || "Prepared By"}</p>
                </div>
                <div className="text-center">
                  <div className="h-6" />
                  <p className="border-t border-slate-300 pt-1 font-semibold">
                    {formData.hodName ? `${formData.hodName} (HOD)` : "HOD"}
                  </p>
                </div>
                <div className="text-center">
                  <div className="h-6" />
                  <p className="border-t border-slate-300 pt-1 font-semibold">
                    {formData.principalName ? `${formData.principalName} (Principal)` : formData.approvedByLabel || "Approved By"}
                  </p>
                </div>
              </div>

              <div className="mt-4 text-center text-[10px] text-slate-400">
                {formData.footerText}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
