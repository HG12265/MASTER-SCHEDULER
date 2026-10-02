"use client";

import React, { useEffect, useState } from "react";
import { AcademicYear, SemesterType, Timetable } from "@/types";
import { academicYearsService, semesterTypesService, timetablesService } from "@/services";

interface ReportFilterBarProps {
  academicYearId?: string;
  semesterTypeId?: string;
  timetableId?: string;
  onFilterChange: (filters: {
    academicYearId?: string;
    semesterTypeId?: string;
    timetableId?: string;
  }) => void;
  onExportExcel?: () => void;
  isExportingExcel?: boolean;
  className?: string;
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  academicYearId,
  semesterTypeId,
  timetableId,
  onFilterChange,
  onExportExcel,
  isExportingExcel = false,
  className = "",
}) => {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [semesterTypes, setSemesterTypes] = useState<SemesterType[]>([]);
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadMeta() {
      try {
        setLoading(true);
        const [yList, stList, ttList] = await Promise.all([
          academicYearsService.getAll(),
          semesterTypesService.getAll(),
          timetablesService.getAll(),
        ]);
        setYears(yList);
        setSemesterTypes(stList);
        setTimetables(ttList);

        // Auto-select defaults if not set
        const curYear = yList.find((y) => y.isCurrent) || yList[0];
        const curSem = stList[0];
        if (!academicYearId && curYear) {
          const matchingTt = ttList.find(
            (t) =>
              t.academicYearId === curYear.id &&
              (curSem ? t.semesterTypeId === curSem.id : true)
          );
          onFilterChange({
            academicYearId: curYear.id,
            semesterTypeId: curSem?.id,
            timetableId: matchingTt?.id,
          });
        }
      } catch (err) {
        console.error("Failed to load filter metadata", err);
      } finally {
        setLoading(false);
      }
    }
    loadMeta();
  }, []);

  const handleYearChange = (newYearId: string) => {
    const matchingTt = timetables.find(
      (t) =>
        t.academicYearId === newYearId &&
        (semesterTypeId ? t.semesterTypeId === semesterTypeId : true)
    );
    onFilterChange({
      academicYearId: newYearId,
      semesterTypeId,
      timetableId: matchingTt?.id || "",
    });
  };

  const handleSemChange = (newSemId: string) => {
    const matchingTt = timetables.find(
      (t) =>
        t.semesterTypeId === newSemId &&
        (academicYearId ? t.academicYearId === academicYearId : true)
    );
    onFilterChange({
      academicYearId,
      semesterTypeId: newSemId,
      timetableId: matchingTt?.id || "",
    });
  };

  const handleTimetableChange = (newTtId: string) => {
    const selected = timetables.find((t) => t.id === newTtId);
    onFilterChange({
      academicYearId: selected ? selected.academicYearId : academicYearId,
      semesterTypeId: selected ? selected.semesterTypeId : semesterTypeId,
      timetableId: newTtId,
    });
  };

  const filteredTimetables = timetables.filter(
    (t) =>
      (!academicYearId || t.academicYearId === academicYearId) &&
      (!semesterTypeId || t.semesterTypeId === semesterTypeId)
  );

  return (
    <div
      className={`p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs mb-6 flex flex-wrap items-center justify-between gap-4 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* Academic Year */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Academic Year
          </label>
          <select
            value={academicYearId || ""}
            onChange={(e) => handleYearChange(e.target.value)}
            disabled={loading}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Academic Years</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name} {y.isCurrent ? "(Current)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Semester Type */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Semester Type
          </label>
          <select
            value={semesterTypeId || ""}
            onChange={(e) => handleSemChange(e.target.value)}
            disabled={loading}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Semester Types</option>
            {semesterTypes.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.code})
              </option>
            ))}
          </select>
        </div>

        {/* Timetable Version */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Timetable Version
          </label>
          <select
            value={timetableId || ""}
            onChange={(e) => handleTimetableChange(e.target.value)}
            disabled={loading}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Latest Active Timetable</option>
            {filteredTimetables.map((t) => (
              <option key={t.id} value={t.id}>
                v{t.version} — {t.status} ({t.validationStatus})
              </option>
            ))}
          </select>
        </div>
      </div>

      {onExportExcel && (
        <button
          type="button"
          disabled={isExportingExcel}
          onClick={onExportExcel}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg shadow-2xs transition-colors disabled:opacity-60"
        >
          {isExportingExcel ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Excel Report
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ReportFilterBar;
