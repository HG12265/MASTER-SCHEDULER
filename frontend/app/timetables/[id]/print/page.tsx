"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Timetable,
  TimetableEntry,
  WorkingDay,
  TimeSlot,
  ClassEntity,
  Faculty,
  InstitutionSettings,
} from "@/types";
import {
  timetablesService,
  workingDaysService,
  timeSlotsService,
  classesService,
  facultyService,
  institutionSettingsService,
} from "@/services";
import { OfficialTimetableHeader } from "@/components/timetable/OfficialTimetableHeader";

export default function TimetablePrintPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const timetableId = params.id as string;
  const viewType = (searchParams.get("view") || "class") as "class" | "faculty" | "master";
  const targetClassId = searchParams.get("classId") || "";
  const targetFacultyId = searchParams.get("facultyId") || "";

  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [settings, setSettings] = useState<InstitutionSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Selected filters for print
  const [selectedClassId, setSelectedClassId] = useState(targetClassId);
  const [selectedFacultyId, setSelectedFacultyId] = useState(targetFacultyId);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [tt, wDays, tSlots, clsRes, facRes, sett] = await Promise.all([
          timetablesService.getById(timetableId),
          workingDaysService.getAll(),
          timeSlotsService.getAll(),
          classesService.getAll({ limit: 1000 }),
          facultyService.getAll({ limit: 1000 }),
          institutionSettingsService.get().catch(() => null),
        ]);

        const cls = clsRes.data;
        const fac = facRes.data;

        setTimetable(tt);
        setWorkingDays(wDays.sort((a, b) => a.dayOrder - b.dayOrder));
        setTimeSlots(tSlots.sort((a, b) => a.slotOrder - b.slotOrder));
        setClasses(cls);
        setFacultyList(fac);
        setSettings(sett);

        if (!selectedClassId && cls.length > 0) {
          setSelectedClassId(cls[0].id);
        }
        if (!selectedFacultyId && fac.length > 0) {
          setSelectedFacultyId(fac[0].id);
        }

        const ent = await timetablesService.getEntries(timetableId);
        setEntries(ent);
      } catch (err) {
        console.error("Failed to load print data", err);
      } finally {
        setLoading(false);
      }
    }
    if (timetableId) {
      loadData();
    }
  }, [timetableId]);

  const activeClass = classes.find((c) => c.id === selectedClassId);
  const activeFaculty = facultyList.find((f) => f.id === selectedFacultyId);

  // Filter entries
  const filteredEntries = entries.filter((e) => {
    if (viewType === "class") return e.classId === selectedClassId;
    if (viewType === "faculty") return e.facultyIds?.includes(selectedFacultyId);
    return true;
  });

  const getCellEntries = (dayId: string, slotId: string) => {
    return filteredEntries.filter(
      (e) => e.workingDayId === dayId && e.timeSlotId === slotId
    );
  };

  const targetDisplayName =
    viewType === "class"
      ? activeClass ? `${activeClass.name} Timetable` : "Class Timetable"
      : viewType === "faculty"
      ? activeFaculty ? `${activeFaculty.name} (${activeFaculty.facultyCode}) Timetable` : "Faculty Timetable"
      : "Master Academic Timetable";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white text-slate-600 text-sm">
        Preparing official printable timetable...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 print:p-0 print:bg-white print:text-black">
      {/* Non-print control bar */}
      <div className="print:hidden max-w-5xl mx-auto mb-6 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center gap-1"
          >
            ← Back to Timetable
          </button>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">
            Print Preview Mode
          </span>
        </div>

        <div className="flex items-center gap-3">
          {viewType === "class" && (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-medium"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {viewType === "faculty" && (
            <select
              value={selectedFacultyId}
              onChange={(e) => setSelectedFacultyId(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-medium"
            >
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.facultyCode})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Timetable
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="max-w-5xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0">
        <OfficialTimetableHeader
          settings={settings}
          academicYearName={timetable?.academicYearId}
          semesterTypeName={timetable?.semesterTypeId}
          targetName={targetDisplayName}
          version={timetable?.version}
          publishedAt={timetable?.publishedAt ?? undefined}
          status={timetable?.status}
        />

        {/* Timetable Grid */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 w-24 text-center font-bold text-slate-700 uppercase">
                  Day / Period
                </th>
                {timeSlots.map((ts) => (
                  <th key={ts.id} className="border border-slate-300 p-2 text-center">
                    <div className="font-bold text-slate-800">{ts.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {ts.startTime} - {ts.endTime}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workingDays.map((day) => (
                <tr key={day.id}>
                  <td className="border border-slate-300 p-2 font-bold text-slate-800 bg-slate-50 text-center">
                    {day.name}
                  </td>
                  {timeSlots.map((slot) => {
                    const cellEnts = getCellEntries(day.id, slot.id);
                    const isNonTeaching = slot.slotType && slot.slotType.toUpperCase() !== "PERIOD";

                    if (isNonTeaching) {
                      return (
                        <td
                          key={slot.id}
                          className="border border-slate-300 p-1 text-center bg-slate-100 text-slate-500 text-[10px] font-bold tracking-wider"
                        >
                          {slot.slotType}
                        </td>
                      );
                    }

                    return (
                      <td
                        key={slot.id}
                        className="border border-slate-300 p-1.5 align-top min-w-[100px] h-16"
                      >
                        {cellEnts.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-slate-300 text-[10px]">
                            —
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {cellEnts.map((e) => (
                              <div
                                key={e.id}
                                className="p-1 rounded bg-slate-50 border border-slate-200 text-left"
                              >
                                <div className="font-bold text-slate-900 text-[11px] leading-tight">
                                  {e.subjectName || "Subject"}
                                </div>
                                <div className="text-[10px] text-slate-600 flex justify-between mt-0.5">
                                  <span>{e.facultyNames?.[0] || "Faculty"}</span>
                                  {e.resourceName && (
                                    <span className="font-mono text-slate-400">
                                      [{e.resourceName}]
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Signatures for Official Print */}
        <div className="mt-12 pt-8 border-t border-slate-300 flex justify-between text-xs text-slate-700">
          <div className="text-center w-36">
            <div className="h-10" />
            <p className="border-t border-slate-400 pt-1 font-semibold">
              {settings?.preparedByLabel || "Prepared By"}
            </p>
          </div>
          <div className="text-center w-36">
            <div className="h-10" />
            <p className="border-t border-slate-400 pt-1 font-semibold">
              {settings?.hodName ? `${settings.hodName} (HOD)` : "HOD"}
            </p>
          </div>
          <div className="text-center w-36">
            <div className="h-10" />
            <p className="border-t border-slate-400 pt-1 font-semibold">
              {settings?.principalName ? `${settings.principalName} (Principal)` : settings?.approvedByLabel || "Approved By"}
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-[10px] text-slate-400">
          {settings?.footerText || "Computer Generated Official Timetable"} • Generated on {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
