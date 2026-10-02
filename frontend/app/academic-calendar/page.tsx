"use client";

import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import {
  academicCalendarService,
  academicYearsService,
  workingDaysService,
} from "@/services";
import {
  AcademicCalendarException,
  CalendarExceptionType,
  AcademicYear,
  WorkingDay,
  DateLookupResponse,
} from "@/types";
import { useToast } from "@/components/Toast";
import {
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Search,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";

export default function AcademicCalendarPage() {
  const toast = useToast();
  const [exceptions, setExceptions] = useState<AcademicCalendarException[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedYearId, setSelectedYearId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AcademicCalendarException | null>(null);
  const [formYearId, setFormYearId] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formType, setFormType] = useState<CalendarExceptionType>("HOLIDAY");
  const [formTitle, setFormTitle] = useState("");
  const [formIsTeachingDay, setFormIsTeachingDay] = useState(false);
  const [formMappedDayId, setFormMappedDayId] = useState<string>("");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Date Lookup Tester
  const [lookupDateInput, setLookupDateInput] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [lookupResult, setLookupResult] = useState<DateLookupResponse | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [exList, years, days] = await Promise.all([
        academicCalendarService.listExceptions(),
        academicYearsService.getAll().catch(() => []),
        workingDaysService.getAll().catch(() => []),
      ]);
      setExceptions(exList);
      setAcademicYears(years);
      setWorkingDays(days.sort((a, b) => a.dayOrder - b.dayOrder));

      if (years.length > 0 && !formYearId) {
        const currentYear = years.find((y) => y.isCurrent) || years[0];
        setFormYearId(currentYear.id);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load calendar exceptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormType("HOLIDAY");
    setFormTitle("");
    setFormIsTeachingDay(false);
    setFormMappedDayId("");
    setFormNotes("");
    if (academicYears.length > 0) {
      const currentYear = academicYears.find((y) => y.isCurrent) || academicYears[0];
      setFormYearId(currentYear.id);
    }
    setShowModal(true);
  };

  const openEditModal = (item: AcademicCalendarException) => {
    setEditingItem(item);
    setFormYearId(item.academicYearId);
    setFormDate(item.date);
    setFormType(item.type);
    setFormTitle(item.title);
    setFormIsTeachingDay(item.isTeachingDay);
    setFormMappedDayId(item.mappedWorkingDayId || "");
    setFormNotes(item.notes || "");
    setShowModal(true);
  };

  const handleTypeChange = (newType: CalendarExceptionType) => {
    setFormType(newType);
    if (newType === "HOLIDAY" || newType === "NO_CLASS_DAY") {
      setFormIsTeachingDay(false);
      setFormMappedDayId("");
    } else if (newType === "SPECIAL_WORKING_DAY" || newType === "WORKING_SATURDAY") {
      setFormIsTeachingDay(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formYearId) {
      toast.error("Please select an academic year");
      return;
    }
    if (!formTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }

    try {
      setSubmitting(true);
      const payload: Partial<AcademicCalendarException> = {
        academicYearId: formYearId,
        date: formDate,
        type: formType,
        title: formTitle.trim(),
        isTeachingDay: formIsTeachingDay,
        mappedWorkingDayId: formMappedDayId || undefined,
        notes: formNotes.trim() || undefined,
      };

      if (editingItem) {
        await academicCalendarService.updateException(editingItem.id, payload);
        toast.success("Calendar exception updated successfully");
      } else {
        await academicCalendarService.createException(payload);
        toast.success("Calendar exception created successfully");
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save calendar exception");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this calendar exception?")) return;
    try {
      await academicCalendarService.deleteException(id);
      toast.success("Exception removed");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete exception");
    }
  };

  const handleLookup = async () => {
    if (!lookupDateInput) return;
    try {
      setLookupLoading(true);
      const res = await academicCalendarService.lookupDate(lookupDateInput);
      setLookupResult(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to test date lookup");
    } finally {
      setLookupLoading(false);
    }
  };

  // Filtered exceptions
  const filteredExceptions = exceptions.filter((ex) => {
    if (selectedYearId !== "ALL" && ex.academicYearId !== selectedYearId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ex.title?.toLowerCase().includes(q);
      const matchDate = ex.date?.includes(q);
      const matchType = ex.type?.toLowerCase().includes(q);
      if (!matchTitle && !matchDate && !matchType) return false;
    }
    return true;
  });

  return (
    <PermissionGuard
      requiredRoles={["SUPER_ADMIN", "ADMIN", "HOD"]}
      fallback={
        <AdminLayout>
          <div className="p-8 text-center text-slate-500">
            Access denied to Academic Calendar.
          </div>
        </AdminLayout>
      }
    >
      <AdminLayout>
        <PageHeader
          title="Academic Calendar Exceptions"
          description="Configure official holidays, working Saturdays, and timetable swaps. The operational scheduler resolves daily classes from these exceptions."
          breadcrumbs={[
            { label: "Operations", href: "/operations" },
            { label: "Academic Calendar" },
          ]}
          action={
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Exception
            </button>
          }
        />

        {/* Date Lookup Tester Card */}
        <div className="mb-6 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Operational Date Resolution Tester
              </h3>
              <p className="text-[11px] text-slate-500">
                Check whether classes run on any specific date and which weekday timetable order applies.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={lookupDateInput}
                onChange={(e) => setLookupDateInput(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold"
              />
              <button
                type="button"
                onClick={handleLookup}
                disabled={lookupLoading}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
              >
                {lookupLoading ? "Testing..." : "Test Resolution"}
              </button>
            </div>
          </div>

          {lookupResult && (
            <div className="mt-3.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-4 text-xs">
              <div>
                <span className="text-slate-400">Day:</span>{" "}
                <span className="font-bold text-slate-900 dark:text-white">{lookupResult.dayOfWeek}</span>
              </div>
              <div>
                <span className="text-slate-400">Instruction:</span>{" "}
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    lookupResult.isTeachingDay
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                  }`}
                >
                  {lookupResult.isTeachingDay ? "TEACHING DAY" : "NO CLASSES (HOLIDAY)"}
                </span>
              </div>
              {lookupResult.effectiveWorkingDayName && (
                <div>
                  <span className="text-slate-400">Effective Timetable:</span>{" "}
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {lookupResult.effectiveWorkingDayName} Order
                  </span>
                </div>
              )}
              {lookupResult.isException && (
                <div>
                  <span className="text-slate-400">Reason:</span>{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {lookupResult.exceptionTitle} ({lookupResult.exceptionType})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search exception title, date..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>

            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-medium"
            >
              <option value="ALL">All Academic Years</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name || ay.year} {ay.isCurrent ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="text-slate-500 text-[11px]">
            Showing <strong>{filteredExceptions.length}</strong> of {exceptions.length} exceptions
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3">Title / Holiday Name</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-center">Instruction</th>
                  <th className="py-3 px-3">Mapped Timetable Day</th>
                  <th className="py-3 px-3">Academic Year</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      Loading calendar exceptions...
                    </td>
                  </tr>
                ) : filteredExceptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      No calendar exceptions found. Click "Add Exception" to register holidays or timetable swaps.
                    </td>
                  </tr>
                ) : (
                  filteredExceptions.map((ex) => (
                    <tr
                      key={ex.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {ex.date}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        {ex.title}
                        {ex.notes && (
                          <div className="text-[10px] text-slate-400 font-normal">{ex.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {ex.type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ex.isTeachingDay
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {ex.isTeachingDay ? "Classes Active" : "No Classes"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-indigo-600 dark:text-indigo-400">
                        {ex.mappedWorkingDayName ? (
                          <span>Follows {ex.mappedWorkingDayName}</span>
                        ) : (
                          <span className="text-slate-400 italic font-normal text-[11px]">Normal Calendar Day</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {ex.academicYearName || "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(ex)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                            title="Edit Exception"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(ex.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                            title="Delete Exception"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CREATE / EDIT MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-indigo-600" />
                  {editingItem ? "Edit Calendar Exception" : "Add Calendar Exception"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Academic Year
                  </label>
                  <select
                    required
                    value={formYearId}
                    onChange={(e) => setFormYearId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="">Select Academic Year...</option>
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name || ay.year} {ay.isCurrent ? "(Current)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Calendar Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Exception Type
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => handleTypeChange(e.target.value as CalendarExceptionType)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium"
                    >
                      <option value="HOLIDAY">Holiday (Non-Teaching)</option>
                      <option value="SPECIAL_WORKING_DAY">Special Working Day</option>
                      <option value="WORKING_SATURDAY">Working Saturday</option>
                      <option value="EXAM_DAY">Exam Day</option>
                      <option value="NO_CLASS_DAY">No Class Day</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Title / Description
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Independence Day, Annual Sports Day, Tuesday Timetable Swap..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isTeachingDay"
                      checked={formIsTeachingDay}
                      onChange={(e) => setFormIsTeachingDay(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label
                      htmlFor="isTeachingDay"
                      className="text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
                    >
                      Are timetable classes conducted on this date? (Teaching Day)
                    </label>
                  </div>

                  {formIsTeachingDay && (
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Map To Working Day Timetable Order (Optional)
                      </label>
                      <select
                        value={formMappedDayId}
                        onChange={(e) => setFormMappedDayId(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      >
                        <option value="">Default (Follow normal weekday order)</option>
                        {workingDays.map((wd) => (
                          <option key={wd.id} value={wd.id}>
                            Follow {wd.name || wd.dayName} Timetable
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Use this for Saturday compensations (e.g. "Work Saturday following Monday timetable").
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Optional administrative remarks..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : editingItem ? "Update Exception" : "Create Exception"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AdminLayout>
    </PermissionGuard>
  );
}
