"use client";

import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { leaveService, facultyService } from "@/services";
import { LeaveRequest, Faculty, LeaveImpactResponse } from "@/types";
import { useToast } from "@/components/Toast";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
  AlertTriangle,
  User,
  Calendar,
} from "lucide-react";

export default function AdminLeaveManagementPage() {
  const toast = useToast();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [facultyMap, setFacultyMap] = useState<Record<string, Faculty>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [facultyFilter, setFacultyFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Approval / Rejection Modal
  const [actionLeave, setActionLeave] = useState<LeaveRequest | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Impact Modal
  const [impactModalData, setImpactModalData] = useState<LeaveImpactResponse | null>(null);
  const [showImpactModal, setShowImpactModal] = useState(false);
  const [impactLoading, setImpactLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [lList, fRes] = await Promise.all([
        leaveService.listLeaveRequests(),
        facultyService.getAll().catch(() => null),
      ]);
      setLeaves(lList);
      const fList: Faculty[] = Array.isArray(fRes) ? fRes : ((fRes as any)?.data || []);
      const fMap: Record<string, Faculty> = {};
      fList.forEach((f) => {
        fMap[f.id] = f;
      });
      setFacultyMap(fMap);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionLeave || !actionType) return;
    try {
      setActionSubmitting(true);
      if (actionType === "APPROVE") {
        await leaveService.approveLeave(actionLeave.id, reviewNotes);
        toast.success("Leave request approved. Affected periods marked for substitution.");
      } else {
        await leaveService.rejectLeave(actionLeave.id, reviewNotes);
        toast.info("Leave request rejected.");
      }
      setActionLeave(null);
      setActionType(null);
      setReviewNotes("");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to process leave action");
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleViewImpact = async (leaveId: string) => {
    try {
      setImpactLoading(true);
      const data = await leaveService.getImpact(leaveId);
      setImpactModalData(data);
      setShowImpactModal(true);
    } catch (err: any) {
      toast.error("Failed to load timetable impact for this leave");
    } finally {
      setImpactLoading(false);
    }
  };

  // Filtered leaves
  const filteredLeaves = leaves.filter((l) => {
    if (statusFilter !== "ALL" && l.status !== statusFilter) return false;
    if (facultyFilter !== "ALL" && l.facultyId !== facultyFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const facName = facultyMap[l.facultyId]?.name?.toLowerCase() || "";
      const reason = l.reason?.toLowerCase() || "";
      if (!facName.includes(q) && !reason.includes(q)) return false;
    }
    return true;
  });

  return (
    <PermissionGuard
      requiredRoles={["SUPER_ADMIN", "ADMIN", "HOD"]}
      fallback={
        <AdminLayout>
          <div className="p-8 text-center text-slate-500">
            Access denied to Leave Approvals queue.
          </div>
        </AdminLayout>
      }
    >
      <AdminLayout>
        <PageHeader
          title="Faculty Leave Approvals"
          description="Review faculty leave applications, analyze timetable impact, and approve or reject with automatic notification."
          breadcrumbs={[
            { label: "Operations", href: "/operations" },
            { label: "Leave Requests" },
          ]}
        />

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search faculty or reason..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-medium"
            >
              <option value="ALL">All Statuses ({leaves.length})</option>
              <option value="PENDING">Pending Only</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-medium max-w-xs truncate"
            >
              <option value="ALL">All Faculty</option>
              {Object.values(facultyMap).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.facultyCode || f.designation || "Faculty"})
                </option>
              ))}
            </select>
          </div>

          <div className="text-slate-500 text-[11px]">
            Showing <strong>{filteredLeaves.length}</strong> of {leaves.length} records
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-3">Duration & Type</th>
                  <th className="py-3 px-3">Reason</th>
                  <th className="py-3 px-3 text-center">Timetable Impact</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Review Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      Loading faculty leave records...
                    </td>
                  </tr>
                ) : filteredLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      No leave requests match the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeaves.map((l) => {
                    const fac = facultyMap[l.facultyId];
                    return (
                      <tr
                        key={l.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-[10px]">
                              {fac?.name?.charAt(0) || "F"}
                            </div>
                            <div>
                              <div>{fac?.name || "Unknown Faculty"}</div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                {fac?.department || "General"} • {fac?.designation || "Faculty"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {l.startDate} {l.startDate !== l.endDate ? `to ${l.endDate}` : ""}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {l.leaveType}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {l.fullDay ? "Full Day" : "Partial"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 max-w-xs truncate text-slate-600 dark:text-slate-400">
                          {l.reason}
                          {l.reviewNotes && (
                            <div className="text-[10px] text-indigo-500 italic mt-0.5">
                              Admin: {l.reviewNotes}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleViewImpact(l.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {l.affectedPeriodsCount ?? 0} periods
                          </button>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              l.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : l.status === "REJECTED"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : l.status === "CANCELLED"
                                ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          {l.status === "PENDING" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setActionLeave(l);
                                  setActionType("APPROVE");
                                  setReviewNotes("");
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors inline-flex items-center gap-1 shadow-2xs"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setActionLeave(l);
                                  setActionType("REJECT");
                                  setReviewNotes("");
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors inline-flex items-center gap-1 shadow-2xs"
                              >
                                <XCircle className="w-3 h-3" />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Processed</span>
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

        {/* APPROVE / REJECT MODAL */}
        {actionLeave && actionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in">
              <div
                className={`p-4 border-b flex justify-between items-center ${
                  actionType === "APPROVE"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200"
                    : "bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/50 text-rose-900 dark:text-rose-200"
                }`}
              >
                <h3 className="font-bold text-sm">
                  {actionType === "APPROVE" ? "Approve Leave Request" : "Reject Leave Request"}
                </h3>
                <button
                  onClick={() => {
                    setActionLeave(null);
                    setActionType(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleReviewSubmit} className="p-5 space-y-4 text-xs">
                <div>
                  <div className="text-slate-500 mb-1">Faculty Member</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {facultyMap[actionLeave.facultyId]?.name}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    {actionLeave.startDate} to {actionLeave.endDate} ({actionLeave.leaveType})
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 mb-1">Reason Stated</div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 italic border border-slate-200 dark:border-slate-700">
                    "{actionLeave.reason}"
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Review Notes / Feedback (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={
                      actionType === "APPROVE"
                        ? "e.g. Approved. Please coordinate substitute classes with department."
                        : "e.g. Insufficient leave balance or critical assessment scheduled."
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                {actionType === "APPROVE" && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
                    Upon approval, the {actionLeave.affectedPeriodsCount ?? 0} scheduled classes for this faculty will be flagged in the daily operations schedule as needing substitutes.
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setActionLeave(null);
                      setActionType(null);
                    }}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionSubmitting}
                    className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors ${
                      actionType === "APPROVE"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-rose-600 hover:bg-rose-700"
                    } disabled:opacity-50`}
                  >
                    {actionSubmitting
                      ? "Processing..."
                      : actionType === "APPROVE"
                      ? "Confirm Approval"
                      : "Confirm Rejection"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TIMETABLE IMPACT DETAILS MODAL */}
        {showImpactModal && impactModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Timetable Impact Analysis
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    {impactModalData.totalAffectedPeriods} class period(s) across {impactModalData.totalTeachingDays} teaching day(s)
                  </div>
                </div>
                <button
                  onClick={() => setShowImpactModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 max-h-96 overflow-y-auto space-y-2 text-xs">
                {impactModalData.affectedPeriods.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">
                    No active published timetable periods scheduled for these dates.
                  </p>
                ) : (
                  impactModalData.affectedPeriods.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {p.date} • {p.timeSlotName} ({p.startTime} - {p.endTime})
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Class: <strong>{p.className}</strong> | Subject: {p.subjectName} ({p.subjectCode})
                        </div>
                        {p.substituteFacultyName && (
                          <div className="text-indigo-600 font-semibold text-[10px] mt-1">
                            Substitute Assigned: {p.substituteFacultyName} ({p.substitutionStatus})
                          </div>
                        )}
                      </div>
                      {p.isMultiFaculty && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                          Co-Faculty Present
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 text-right">
                <button
                  onClick={() => setShowImpactModal(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-800 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </PermissionGuard>
  );
}
