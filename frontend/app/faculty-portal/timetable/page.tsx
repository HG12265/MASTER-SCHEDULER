"use client";

import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import {
  timetablesService,
  workingDaysService,
  timeSlotsService,
  institutionSettingsService,
} from "@/services";
import {
  Timetable,
  TimetableEntry,
  WorkingDay,
  TimeSlot,
  InstitutionSettings,
} from "@/types";
import { OfficialTimetableHeader } from "@/components/timetable/OfficialTimetableHeader";
import { Printer } from "lucide-react";

export default function FacultyTimetablePage() {
  const { user } = useAuth();
  const facultyId = user?.facultyId;

  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [settings, setSettings] = useState<InstitutionSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [pubRes, wDays, tSlots, sett] = await Promise.all([
          timetablesService.getAll({ status: "PUBLISHED" }),
          workingDaysService.getAll(),
          timeSlotsService.getAll(),
          institutionSettingsService.get().catch(() => null),
        ]);

        setWorkingDays(wDays.sort((a, b) => a.dayOrder - b.dayOrder));
        setTimeSlots(tSlots.sort((a, b) => a.slotOrder - b.slotOrder));
        setSettings(sett);

        if (Array.isArray(pubRes) && pubRes.length > 0) {
          const tt = pubRes[0];
          setTimetable(tt);
          const allEntries = await timetablesService.getEntries(tt.id);
          if (facultyId) {
            const myEnts = allEntries.filter((e: TimetableEntry) =>
              e.facultyIds?.includes(facultyId)
            );
            setEntries(myEnts);
          } else {
            setEntries(allEntries);
          }
        }
      } catch (err) {
        console.error("Failed to load faculty timetable", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [facultyId]);

  const getCellEntries = (dayId: string, slotId: string) => {
    return entries.filter(
      (e) => e.workingDayId === dayId && e.timeSlotId === slotId
    );
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Personal Faculty Timetable"
        description="Official published weekly schedule for your assigned teaching sessions and courses."
        breadcrumbs={[
          { label: "Faculty Portal", href: "/faculty-portal" },
          { label: "My Timetable" },
        ]}
        action={
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Timetable
          </button>
        }
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-6 overflow-hidden">
        <OfficialTimetableHeader
          settings={settings}
          academicYearName={timetable?.academicYearId}
          semesterTypeName={timetable?.semesterTypeId}
          targetName={`${user?.facultyName || user?.username || "Faculty"} Timetable`}
          version={timetable?.version}
          publishedAt={timetable?.publishedAt ?? undefined}
          status={timetable?.status}
        />

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Loading your official timetable...
          </div>
        ) : !timetable ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No published timetable found. Please check with your academic administrator.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60">
                  <th className="border border-slate-200 dark:border-slate-800 p-2.5 w-28 text-center font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Day / Period
                  </th>
                  {timeSlots.map((ts) => (
                    <th
                      key={ts.id}
                      className="border border-slate-200 dark:border-slate-800 p-2 text-center"
                    >
                      <div className="font-bold text-slate-800 dark:text-white">
                        {ts.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {ts.startTime} - {ts.endTime}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workingDays.map((day) => (
                  <tr key={day.id}>
                    <td className="border border-slate-200 dark:border-slate-800 p-2.5 font-bold text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                      {day.name}
                    </td>
                    {timeSlots.map((slot) => {
                      const cellEnts = getCellEntries(day.id, slot.id);
                      const isNonTeaching = slot.slotType && slot.slotType.toUpperCase() !== "PERIOD";

                      if (isNonTeaching) {
                        return (
                          <td
                            key={slot.id}
                            className="border border-slate-200 dark:border-slate-800 p-1 text-center bg-slate-100/60 dark:bg-slate-800 text-slate-400 text-[10px] font-bold tracking-wider"
                          >
                            {slot.slotType}
                          </td>
                        );
                      }

                      return (
                        <td
                          key={slot.id}
                          className="border border-slate-200 dark:border-slate-800 p-1.5 align-top min-w-[110px] h-20"
                        >
                          {cellEnts.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-300 dark:text-slate-700 text-[11px]">
                              —
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {cellEnts.map((e) => (
                                <div
                                  key={e.id}
                                  className="p-1.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-left shadow-2xs"
                                >
                                  <div className="font-bold text-indigo-950 dark:text-indigo-200 text-xs leading-tight">
                                    {e.subjectName}
                                  </div>
                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                                    Class: <strong>{e.className}</strong>
                                  </div>
                                  {e.resourceName && (
                                    <div className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                                      Room: {e.resourceName}
                                    </div>
                                  )}
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
        )}
      </div>
    </AdminLayout>
  );
}
