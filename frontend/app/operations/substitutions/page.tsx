"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import {
  substitutionService,
  operationsService,
  facultyService,
} from "@/services";
import {
  Substitution,
  SubstitutionCandidateResponse,
  DailyScheduleSummary,
  DailyScheduleSession,
  Faculty,
} from "@/types";
import { useToast } from "@/components/Toast";
import {
  Users,
  Sparkles,
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  UserCheck,
  Building,
  RefreshCw,
  Award,
} from "lucide-react";

function SubstitutionsContent() {
  const toast = useToast();
  const searchParams = useSearchParams();

  const initialDate =
    searchParams.get("date") || new Date().toISOString().split("T")[0];
  const initialEntryId = searchParams.get("entryId") || "";

  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [dailySchedule, setDailySchedule] = useState<DailyScheduleSummary | null>(null);
  const [facultyMap, setFacultyMap] = useState<Record<string, Faculty>>({});
  const [loading, setLoading] = useState(true);

  // Candidate Recommendation Modal
  const [selectedSession, setSelectedSession] = useState<DailyScheduleSession | null>(null);
  const [candidateData, setCandidateData] = useState<SubstitutionCandidateResponse | null>(null);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [assigningFacultyId, setAssigningFacultyId] = useState<string | null>(null);
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const loadData = async (dateStr: string) => {
    try {
      setLoading(true);
      const [subs, sched, fRes] = await Promise.all([
        substitutionService.listSubstitutions({ date: dateStr }),
        operationsService.getDailySchedule(dateStr),
        facultyService.getAll().catch(() => null),
      ]);
      setSubstitutions(subs);
      setDailySchedule(sched);

      const fList: Faculty[] = Array.isArray(fRes) ? fRes : ((fRes as any)?.data || []);
      const fMap: Record<string, Faculty> = {};
      fList.forEach((f) => {
        fMap[f.id] = f;
      });
      setFacultyMap(fMap);

      // Auto-open candidate modal if query param entryId provided
      if (initialEntryId && sched?.sessions) {
        const found = sched.sessions.find((s) => s.entryId === initialEntryId);
        if (found) {
          handleOpenCandidates(found, dateStr);
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load substitutions data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      loadData(selectedDate);
    }
  }, [selectedDate]);

  const handleOpenCandidates = async (session: DailyScheduleSession, dateStr: string) => {
    setSelectedSession(session);
    setCandidateData(null);
    setAssigningFacultyId(null);
    setAssignmentNotes("");
    try {
      setCandidateLoading(true);
      const res = await substitutionService.getCandidates(dateStr, session.entryId);
      setCandidateData(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to fetch candidate recommendations");
    } finally {
      setCandidateLoading(false);
    }
  };

  const handleAssignSubmit = async () => {
    if (!selectedSession) return;
    try {
      setAssignSubmitting(true);
      await substitutionService.assignSubstitution({
        date: selectedDate,
        originalEntryId: selectedSession.entryId,
        substituteFacultyId: assigningFacultyId || undefined,
        assignmentType: assigningFacultyId ? "SUBSTITUTION" : "CANCELLED",
        notes: assignmentNotes,
      });
      toast.success("Substitute assigned successfully!");
      setSelectedSession(null);
      setCandidateData(null);
      loadData(selectedDate);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to assign substitute");
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleCancelSub = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this substitution?")) return;
    try {
      await substitutionService.cancelSubstitution(id);
      toast.info("Substitution cancelled");
      loadData(selectedDate);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to cancel substitution");
    }
  };

  // Sessions requiring substitutes
  const unresolvedSessions = dailySchedule?.sessions?.filter(
    (s) => s.sessionStatus === "UNRESOLVED"
  ) || [];

  return (
    <AdminLayout>
      <PageHeader
        title="Substitutions Management"
        description="Smart candidate recommendation engine with workload scoring, conflict checks, and temporary substitute assignments."
        breadcrumbs={[
          { label: "Operations", href: "/operations" },
          { label: "Substitutions" },
        ]}
        action={
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 shadow-2xs"
            />
            <button
              onClick={() => loadData(selectedDate)}
              className="p-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        }
      />

      {/* Unresolved Periods Alert Section */}
      {unresolvedSessions.length > 0 && (
        <div className="mb-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 rounded-xl p-4">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-xs mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              {unresolvedSessions.length} Class Session(s) Require Substitute Coverage on {selectedDate}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {unresolvedSessions.map((s) => (
              <div
                key={s.entryId}
                className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-rose-200 dark:border-rose-900/40 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      {s.className}
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                      Needs Sub
                    </span>
                  </div>
                  <div className="font-medium text-slate-800 dark:text-slate-200 text-xs mt-1">
                    {s.subjectName} ({s.subjectCode})
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {s.timeSlotName} ({s.startTime} - {s.endTime})
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Regular: <span className="line-through">{s.scheduledFacultyNames?.join(", ") || "Faculty"}</span> (On Leave)
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => handleOpenCandidates(s, selectedDate)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Recommend Substitute
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Substitutions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-xs">
              Recorded Substitutions for {selectedDate}
            </h3>
            <p className="text-[11px] text-slate-500">
              Temporary faculty adjustments active on this operational date
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {substitutions.length} Recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Period / Time</th>
                <th className="py-3 px-3">Class</th>
                <th className="py-3 px-3">Subject</th>
                <th className="py-3 px-3">Original Faculty</th>
                <th className="py-3 px-3">Substitute Faculty</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    Loading substitution records...
                  </td>
                </tr>
              ) : substitutions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    No substitutions recorded for this date.
                  </td>
                </tr>
              ) : (
                substitutions.map((sub) => {
                  const origFac = facultyMap[sub.absentFacultyId];
                  const subFac = sub.substituteFacultyId
                    ? facultyMap[sub.substituteFacultyId]
                    : null;

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {sub.timeSlotName || "Slot"}
                        <div className="text-[10px] text-slate-400 font-mono">
                          {sub.startTime} - {sub.endTime}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {sub.className || "Class"}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {sub.subjectName || "Subject"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {sub.subjectCode}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="line-through text-slate-400 font-medium">
                          {origFac?.name || sub.absentFacultyName || "Faculty"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {subFac ? (
                          <div className="font-bold text-indigo-600 dark:text-indigo-400">
                            {subFac.name}
                            <div className="text-[10px] text-slate-400 font-normal">
                              {subFac.department}
                            </div>
                          </div>
                        ) : sub.assignmentType === "CANCELLED" ? (
                          <span className="text-amber-600 font-semibold">Free Period / Self Study</span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sub.status === "ASSIGNED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : sub.status === "CANCELLED"
                              ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {sub.status !== "CANCELLED" && (
                          <button
                            onClick={() => handleCancelSub(sub.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                            title="Cancel Substitution"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CANDIDATE RECOMMENDATION MODAL */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Substitute Recommendation Engine
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    {selectedSession.className} • {selectedSession.subjectName} ({selectedSession.timeSlotName})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>

            {/* Candidate List */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {candidateLoading ? (
                <div className="py-16 text-center text-slate-400">
                  <Sparkles className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
                  Analyzing faculty availability, allocations, and daily workload scores...
                </div>
              ) : !candidateData || candidateData.candidates.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  No eligible substitute candidates found for this time period.
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-[11px] text-slate-500">
                    Candidates ranked by subject match, department proximity, and current daily workload:
                  </div>

                  {candidateData.candidates.map((c) => {
                    const isSelected = assigningFacultyId === c.facultyId;
                    return (
                      <div
                        key={c.facultyId}
                        onClick={() => setAssigningFacultyId(c.facultyId)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-xs"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="candidate"
                              checked={isSelected}
                              onChange={() => setAssigningFacultyId(c.facultyId)}
                              className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                                {c.facultyName}
                                {c.matchScore >= 50 && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-0.5">
                                    <Award className="w-2.5 h-2.5" /> Best Match
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {c.department || "Faculty"} • Daily Sessions: {c.scheduledPeriodsToday}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-xs font-black font-mono px-2 py-0.5 rounded-lg ${
                                c.matchScore >= 50
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : c.matchScore >= 20
                                  ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              Score: {c.matchScore}
                            </span>
                          </div>
                        </div>

                        {/* Factual reasons */}
                        <div className="mt-2 pl-6">
                          <div className="flex flex-wrap gap-1">
                            {c.reasons.map((r, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md font-medium"
                              >
                                ✓ {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Assignment Notes */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Assignment Notes (Optional)
                </label>
                <input
                  type="text"
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  placeholder="e.g. Discussed with HOD; covering Lab experiment module."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
              <button
                onClick={() => {
                  setAssigningFacultyId(null);
                  handleAssignSubmit();
                }}
                className="text-xs text-amber-700 dark:text-amber-400 hover:underline"
              >
                Mark as Free Period / Self-Study
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSession(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!assigningFacultyId || assignSubmitting}
                  onClick={handleAssignSubmit}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors shadow-2xs"
                >
                  {assignSubmitting ? "Assigning..." : "Confirm Substitution"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function SubstitutionsPage() {
  return (
    <PermissionGuard
      requiredRoles={["SUPER_ADMIN", "ADMIN", "HOD"]}
      fallback={
        <AdminLayout>
          <div className="p-8 text-center text-slate-500">
            Access denied to Substitutions Manager.
          </div>
        </AdminLayout>
      }
    >
      <Suspense fallback={<div>Loading substitutions...</div>}>
        <SubstitutionsContent />
      </Suspense>
    </PermissionGuard>
  );
}
