"use client";

import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { leaveService, timeSlotsService } from "@/services";
import {
  LeaveRequest,
  LeaveType,
  TimeSlot,
  LeaveImpactResponse,
} from "@/types";
import { useToast } from "@/components/Toast";
import {
  CalendarCheck,
  Plus,
  AlertTriangle,
  Clock,
  Eye,
  XCircle,
  Calendar,
} from "lucide-react";

export default function FacultyLeavePortalPage() {
  const toast = useToast();
  const { user } = useAuth();
  const facultyId = user?.facultyId;

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply Leave Modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>("CASUAL");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [fullDay, setFullDay] = useState(true);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [impactPreview, setImpactPreview] = useState<LeaveImpactResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // View Impact Detail Modal
  const [activeImpact, setActiveImpact] = useState<LeaveImpactResponse | null>(null);
  const [showImpactModal, setShowImpactModal] = useState(false);

  const loadLeaves = async () => {
    try {
      setLoading(true);
      if (facultyId) {
        const [lList, slots] = await Promise.all([
          leaveService.listLeaveRequests({ facultyId }),
          timeSlotsService.getAll().catch(() => []),
        ]);
        setLeaves(lList);
        setTimeSlots(slots.filter((s) => s.slotType === "PERIOD"));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, [facultyId]);

  const handlePreviewImpact = async () => {
    if (!facultyId) return;
    try {
      setPreviewLoading(true);
      const res = await leaveService.previewImpact({
        facultyId,
        leaveType,
        startDate,
        endDate,
        fullDay,
        affectedTimeSlotIds: selectedSlots,
        reason: reason || "Preview Check",
      });
      setImpactPreview(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to calculate leave impact");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facultyId) {
      toast.error("Your user account is not linked to a faculty profile.");
      return;
    }
    try {
      setSubmitting(true);
      await leaveService.createLeaveRequest({
        facultyId,
        leaveType,
        startDate,
        endDate,
        fullDay,
        affectedTimeSlotIds: selectedSlots,
        reason,
      });
      toast.success("Leave request submitted successfully for approval");
      setShowApplyModal(false);
      setReason("");
      setImpactPreview(null);
      loadLeaves();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = async (id: string) => {
    try {
      await leaveService.cancelLeave(id);
      toast.info("Leave request cancelled");
      loadLeaves();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to cancel leave");
    }
  };

  const handleViewImpact = async (leaveId: string) => {
    try {
      const res = await leaveService.getImpact(leaveId);
      setActiveImpact(res);
      setShowImpactModal(true);
    } catch (err: any) {
      toast.error("Failed to load impact details");
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Faculty Leave Management"
        description="Submit leave requests, preview affected class periods, and track approval status."
        breadcrumbs={[
          { label: "Faculty Portal", href: "/faculty-portal" },
          { label: "Leave Requests" },
        ]}
        action={
          <button
            onClick={() => {
              setImpactPreview(null);
              setShowApplyModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Apply For Leave
          </button>
        }
      />

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Leave Duration</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Reason</th>
                <th className="py-3 px-3 text-center">Affected Classes</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading your leave requests...
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No leave requests found. Click "Apply For Leave" to file a request.
                  </td>
                </tr>
              ) : (
                leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {l.startDate} {l.startDate !== l.endDate ? `to ${l.endDate}` : ""}
                      <div className="text-[10px] text-slate-400 font-normal">
                        {l.fullDay ? "Full Day" : "Selected Periods"}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {l.leaveType}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate text-slate-600 dark:text-slate-400">
                      {l.reason}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      <button
                        onClick={() => handleViewImpact(l.id)}
                        className="text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-1"
                      >
                        {l.affectedPeriodsCount ?? 0} periods
                      </button>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          l.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : l.status === "REJECTED"
                            ? "bg-rose-100 text-rose-800"
                            : l.status === "CANCELLED"
                            ? "bg-slate-200 text-slate-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewImpact(l.id)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                          title="View Affected Classes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {l.status === "PENDING" && (
                          <button
                            onClick={() => handleCancelLeave(l.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors"
                            title="Cancel Leave"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* APPLY FOR LEAVE MODAL WITH IMPACT PREVIEW */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in max-h-[90vh] flex flex-col">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-indigo-600" /> Apply For Faculty Leave
              </h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Leave Type
                  </label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium"
                  >
                    <option value="CASUAL">Casual Leave (CL)</option>
                    <option value="MEDICAL">Medical Leave (ML)</option>
                    <option value="DUTY">Duty Leave</option>
                    <option value="ON_DUTY">On Duty (OD)</option>
                    <option value="OTHER">Other Leave</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Coverage Mode
                  </label>
                  <select
                    value={fullDay ? "FULL" : "PARTIAL"}
                    onChange={(e) => setFullDay(e.target.value === "FULL")}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium"
                  >
                    <option value="FULL">Full Day</option>
                    <option value="PARTIAL">Selected Periods Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              {!fullDay && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Select Affected Teaching Periods
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {timeSlots.map((ts) => {
                      const isSelected = selectedSlots.includes(ts.id);
                      return (
                        <button
                          key={ts.id}
                          type="button"
                          onClick={() => {
                            setSelectedSlots(
                              isSelected
                                ? selectedSlots.filter((id) => id !== ts.id)
                                : [...selectedSlots, ts.id]
                            );
                          }}
                          className={`p-2 rounded-lg border text-center text-xs transition-colors ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="font-bold">{ts.name}</div>
                          <div className="text-[10px] opacity-75">{ts.startTime}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Reason for Leave
                </label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the reason for this leave request..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              {/* Preview Button */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500">
                  Analyze which published timetable periods will be affected.
                </span>
                <button
                  type="button"
                  onClick={handlePreviewImpact}
                  disabled={previewLoading}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg font-semibold text-slate-800 dark:text-slate-200 transition-colors"
                >
                  {previewLoading ? "Analyzing..." : "Preview Timetable Impact"}
                </button>
              </div>

              {/* Impact Preview Section */}
              {impactPreview && (
                <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold mb-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      {impactPreview.totalAffectedPeriods} Class Session(s) Affected Across {impactPreview.totalTeachingDays} Teaching Day(s)
                    </span>
                  </div>
                  {impactPreview.totalAffectedPeriods === 0 ? (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      No teaching periods scheduled on published timetables for these dates.
                    </p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1.5">
                      {impactPreview.affectedPeriods.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded bg-white/80 dark:bg-slate-900/60 text-[11px] border border-amber-100 dark:border-amber-900/40"
                        >
                          <div>
                            <span className="font-bold text-slate-800 dark:text-white">
                              {p.date} • {p.timeSlotName}
                            </span>
                            <div className="text-slate-500 text-[10px]">
                              {p.className} - {p.subjectName}
                            </div>
                          </div>
                          <span className="font-mono text-[10px] text-slate-500">
                            {p.startTime} - {p.endTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Leave Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW IMPACT DETAILS MODAL */}
      {showImpactModal && activeImpact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Affected Timetable Periods ({activeImpact.totalAffectedPeriods})
              </h3>
              <button
                onClick={() => setShowImpactModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>
            <div className="p-5 max-h-96 overflow-y-auto space-y-2 text-xs">
              {activeImpact.affectedPeriods.length === 0 ? (
                <p className="text-slate-400 text-center py-6">
                  No published periods affected by this leave request.
                </p>
              ) : (
                activeImpact.affectedPeriods.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {p.date} • {p.timeSlotName} ({p.startTime} - {p.endTime})
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Class: <strong>{p.className}</strong> | Subject: {p.subjectName} ({p.subjectCode})
                      </div>
                      {p.substituteFacultyName && (
                        <div className="text-indigo-600 font-semibold text-[10px] mt-1">
                          Substitute: {p.substituteFacultyName} ({p.substitutionStatus})
                        </div>
                      )}
                    </div>
                    {p.isMultiFaculty && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700">
                        Multi-Faculty
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
  );
}
