"use client";

import React, { useEffect, useState } from "react";
import { InstitutionSettings } from "@/types";
import { institutionSettingsService } from "@/services";

interface OfficialTimetableHeaderProps {
  settings?: InstitutionSettings | null;
  academicYearName?: string;
  semesterTypeName?: string;
  targetName?: string; // Class name or Faculty name or "Master Timetable"
  version?: number;
  publishedAt?: string;
  status?: string;
  className?: string;
}

export const OfficialTimetableHeader: React.FC<OfficialTimetableHeaderProps> = ({
  settings: propSettings,
  academicYearName,
  semesterTypeName,
  targetName,
  version,
  publishedAt,
  status,
  className = "",
}) => {
  const [settings, setSettings] = useState<InstitutionSettings | null>(propSettings || null);

  useEffect(() => {
    if (!propSettings) {
      institutionSettingsService
        .get()
        .then((res) => setSettings(res))
        .catch(() => {});
    }
  }, [propSettings]);

  const displaySettings = settings || {
    institutionName: "Institution Timetable System",
    departmentName: "Academic Administration",
    addressLine1: "",
    addressLine2: "",
    academicTitle: "Official Academic Timetable",
    footerText: "Computer Generated Timetable",
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    return new Date(isoString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div
      className={`border-b border-slate-200 dark:border-slate-800 pb-4 mb-4 text-center ${className}`}
    >
      <div className="flex flex-col items-center justify-center">
        {(displaySettings.logoPath || displaySettings.logoUrl) && (
          <img
            src={(displaySettings.logoPath || displaySettings.logoUrl)!}
            alt="Logo"
            className="h-14 w-auto mb-2 object-contain"
          />
        )}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
          {displaySettings.institutionName}
        </h1>
        {displaySettings.departmentName && (
          <h2 className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300">
            {displaySettings.departmentName}
          </h2>
        )}
        {(displaySettings.addressLine1 || displaySettings.addressLine2) && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {[displaySettings.addressLine1, displaySettings.addressLine2]
              .filter(Boolean)
              .join(", ")}
          </p>
        )}
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {displaySettings.academicTitle}
          </span>
          {targetName && (
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
              • {targetName}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-2 px-2">
        <div className="flex items-center gap-4">
          {academicYearName && (
            <span>
              <strong>Academic Year:</strong> {academicYearName}
            </span>
          )}
          {semesterTypeName && (
            <span>
              <strong>Semester:</strong> {semesterTypeName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {version && (
            <span>
              <strong>Version:</strong> v{version}
            </span>
          )}
          {status && (
            <span>
              <strong>Status:</strong> {status}
            </span>
          )}
          <span>
            <strong>Date:</strong> {formatDate(publishedAt)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OfficialTimetableHeader;
