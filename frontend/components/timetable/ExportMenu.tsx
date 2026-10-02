"use client";

import React, { useState } from "react";
import { exportService } from "@/services";
import { useToast } from "@/components/Toast";

interface ExportMenuProps {
  timetableId: string;
  activeView: "class" | "faculty" | "master";
  selectedClassId?: string;
  selectedFacultyId?: string;
  onPrint?: () => void;
  className?: string;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
  timetableId,
  activeView,
  selectedClassId,
  selectedFacultyId,
  onPrint,
  className = "",
}) => {
  const toast = useToast();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleExportPdf = async (viewType = activeView) => {
    try {
      setIsExportingPdf(true);
      await exportService.downloadTimetablePdf(timetableId, {
        view: viewType,
        classId: viewType === "class" ? selectedClassId : undefined,
        facultyId: viewType === "faculty" ? selectedFacultyId : undefined,
      });
      toast.success(`Official ${viewType.toUpperCase()} Timetable PDF exported successfully.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to export PDF timetable.");
    } finally {
      setIsExportingPdf(false);
      setIsOpen(false);
    }
  };

  const handleExportExcel = async (viewType = activeView) => {
    try {
      setIsExportingExcel(true);
      await exportService.downloadTimetableExcel(timetableId, {
        view: viewType,
        classId: viewType === "class" ? selectedClassId : undefined,
        facultyId: viewType === "faculty" ? selectedFacultyId : undefined,
      });
      toast.success(`Official ${viewType.toUpperCase()} Timetable Excel exported successfully.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to export Excel timetable.");
    } finally {
      setIsExportingExcel(false);
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`}>
      {/* PDF Button */}
      <button
        type="button"
        disabled={isExportingPdf}
        onClick={() => handleExportPdf(activeView)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg shadow-2xs transition-colors disabled:opacity-60"
        title="Download Official PDF"
      >
        {isExportingPdf ? (
          <>
            <svg
              className="animate-spin h-3.5 w-3.5 text-rose-600"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generating PDF...
          </>
        ) : (
          <>
            <svg
              className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            Export PDF
          </>
        )}
      </button>

      {/* Excel Button */}
      <button
        type="button"
        disabled={isExportingExcel}
        onClick={() => handleExportExcel(activeView)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg shadow-2xs transition-colors disabled:opacity-60"
        title="Download Official Excel Workbook"
      >
        {isExportingExcel ? (
          <>
            <svg
              className="animate-spin h-3.5 w-3.5 text-emerald-600"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generating Excel...
          </>
        ) : (
          <>
            <svg
              className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export Excel
          </>
        )}
      </button>

      {/* Print Button */}
      {onPrint && (
        <button
          type="button"
          onClick={onPrint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs transition-colors"
          title="Print Friendly View"
        >
          <svg
            className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Print
        </button>
      )}

      {/* Options Dropdown for other views (Master, etc.) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
          title="More Export Options"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1.5 z-50 text-xs">
            <div className="px-3 py-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
              Master Timetable Export
            </div>
            <button
              type="button"
              disabled={isExportingPdf}
              onClick={() => handleExportPdf("master")}
              className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
            >
              <span>Master PDF (All Classes)</span>
              <span className="text-[10px] text-rose-500 font-bold">PDF</span>
            </button>
            <button
              type="button"
              disabled={isExportingExcel}
              onClick={() => handleExportExcel("master")}
              className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
            >
              <span>Full Master Workbook (6 Sheets)</span>
              <span className="text-[10px] text-emerald-500 font-bold">XLSX</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportMenu;
