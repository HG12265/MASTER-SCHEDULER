"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Lock,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  School,
  Table as TableIcon,
  LayoutGrid,
  Filter,
  Users,
  Building2,
  BookOpen,
  Info,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { FormField, Input, Select, Textarea, Toggle } from "@/components/FormFields";
import { useToast } from "@/components/Toast";
import { fixedSlotsService } from "@/services/fixedSlots";
import { academicYearsService } from "@/services/academicYears";
import { semesterTypesService } from "@/services/semesterTypes";
import { classesService } from "@/services/classes";
import { subjectsService } from "@/services/subjects";
import { facultyService } from "@/services/faculty";
import { resourcesService } from "@/services/resources";
import { workingDaysService } from "@/services/workingDays";
import { timeSlotsService } from "@/services/timeSlots";
import {
  FixedSlot,
  FixedSlotFormData,
  FixedSlotCategory,
  AcademicYear,
  SemesterType,
  ClassEntity,
  Subject,
  Faculty,
  ResourceItem,
  WorkingDay,
  TimeSlot,
  TableColumn,
} from "@/types";

const CATEGORY_LABELS: Record<FixedSlotCategory, { label: string; color: string }> = {
  SUBJECT: { label: "Fixed Subject", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  LIBRARY: { label: "Library", color: "bg-sky-50 text-sky-700 border-sky-200" },
  SUPPORTIVE: { label: "Supportive Course", color: "bg-teal-50 text-teal-700 border-teal-200" },
  NET_SET: { label: "NET / SET Coaching", color: "bg-purple-50 text-purple-700 border-purple-200" },
  ACTIVITY: { label: "Department Activity", color: "bg-amber-50 text-amber-700 border-amber-200" },
  MEETING: { label: "Faculty / Dept Meeting", color: "bg-slate-100 text-slate-700 border-slate-300" },
  OTHER: { label: "Other Fixed Period", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default function FixedSlotsPage() {
  const toast = useToast();

  // Master Data
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesterTypes, setSemesterTypes] = useState<SemesterType[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [facultyMembers, setFacultyMembers] = useState<Faculty[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);
  const [teachingSlots, setTeachingSlots] = useState<TimeSlot[]>([]);

  // Active View: Table vs Grid
  const [activeView, setActiveView] = useState<"TABLE" | "GRID">("GRID");

  // Filters
  const [filterYearId, setFilterYearId] = useState<string>("");
  const [filterSemTypeId, setFilterSemTypeId] = useState<string>("");
  const [filterClassId, setFilterClassId] = useState<string>("");
  const [filterFacultyId, setFilterFacultyId] = useState<string>("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  // Data states
  const [fixedSlots, setFixedSlots] = useState<FixedSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<FixedSlot | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FixedSlotFormData>({
    academicYearId: "",
    semesterTypeId: "",
    classId: "",
    workingDayId: "",
    timeSlotId: "",
    slotCategory: "SUBJECT",
    subjectId: "",
    facultyIds: [],
    resourceId: "",
    title: "",
    description: "",
    isLocked: true,
  });

  // Delete Dialog state
  const [deleteTarget, setDeleteTarget] = useState<FixedSlot | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Load masters on mount
  useEffect(() => {
    async function loadMasters() {
      try {
        setLoading(true);
        const [ays, sts, cls, subs, facs, res, days, slots] = await Promise.all([
          academicYearsService.getAll(),
          semesterTypesService.getAll(),
          classesService.getAll({ limit: 100 }),
          subjectsService.getAll({ limit: 100 }),
          facultyService.getAll({ limit: 100 }),
          resourcesService.getAll({ limit: 100 }),
          workingDaysService.getAll(),
          timeSlotsService.getAll(),
        ]);

        setAcademicYears(ays || []);
        setSemesterTypes(sts || []);
        setClasses(cls.data || []);
        setSubjects(subs.data || []);
        setFacultyMembers(facs.data || []);
        setResources(res.data || []);

        const sortedDays = (days || [])
          .filter((d) => d.isWorkingDay)
          .sort((a, b) => a.dayOrder - b.dayOrder);
        setWorkingDays(sortedDays);

        const sortedSlots = (slots || [])
          .filter((s) => s.isTeachingSlot)
          .sort((a, b) => a.slotOrder - b.slotOrder);
        setTeachingSlots(sortedSlots);

        // Pre-select current
        const currentAy = ays.find((a) => a.isCurrent);
        const ayId = currentAy ? currentAy.id : ays[0]?.id || "";
        const semId = sts[0]?.id || "";
        const cId = cls.data[0]?.id || "";

        setFilterYearId(ayId);
        setFilterSemTypeId(semId);
        setFilterClassId(cId);

        setFormData((prev) => ({
          ...prev,
          academicYearId: ayId,
          semesterTypeId: semId,
          classId: cId,
        }));
      } catch (err: unknown) {
        toast.showToast(err instanceof Error ? err.message : "Failed to load master data", "error");
      } finally {
        setLoading(false);
      }
    }
    loadMasters();
  }, [toast]);

  // Fetch Fixed Slots
  const fetchFixedSlots = useCallback(async () => {
    if (!filterYearId || !filterSemTypeId) return;

    try {
      setLoading(true);
      const data = await fixedSlotsService.getAll({
        academicYearId: filterYearId,
        semesterTypeId: filterSemTypeId,
        classId: filterClassId === "ALL" ? undefined : filterClassId || undefined,
        facultyId: filterFacultyId === "ALL" ? undefined : filterFacultyId || undefined,
        slotCategory: filterCategory === "ALL" ? undefined : filterCategory || undefined,
        isActive: true,
      });
      setFixedSlots(data || []);
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Failed to fetch fixed slots", "error");
    } finally {
      setLoading(false);
    }
  }, [filterYearId, filterSemTypeId, filterClassId, filterFacultyId, filterCategory, toast]);

  useEffect(() => {
    if (filterYearId && filterSemTypeId) {
      fetchFixedSlots();
    }
  }, [fetchFixedSlots, filterYearId, filterSemTypeId, filterClassId, filterFacultyId, filterCategory]);

  // Open modal to add new
  const handleOpenAdd = (dayId?: string, slotId?: string) => {
    setEditingItem(null);
    setConflictError(null);
    setFormData({
      academicYearId: filterYearId,
      semesterTypeId: filterSemTypeId,
      classId: filterClassId && filterClassId !== "ALL" ? filterClassId : classes[0]?.id || "",
      workingDayId: dayId || workingDays[0]?.id || "",
      timeSlotId: slotId || teachingSlots[0]?.id || "",
      slotCategory: "SUBJECT",
      subjectId: "",
      facultyIds: [],
      resourceId: "",
      title: "",
      description: "",
      isLocked: true,
    });
    setIsModalOpen(true);
  };

  // Open modal to edit
  const handleOpenEdit = (item: FixedSlot) => {
    setEditingItem(item);
    setConflictError(null);
    setFormData({
      academicYearId: item.academicYearId,
      semesterTypeId: item.semesterTypeId,
      classId: item.classId,
      workingDayId: item.workingDayId,
      timeSlotId: item.timeSlotId,
      slotCategory: item.slotCategory,
      subjectId: item.subjectId || "",
      facultyIds: item.facultyIds || [],
      resourceId: item.resourceId || "",
      title: item.title || "",
      description: item.description || "",
      isLocked: item.isLocked,
    });
    setIsModalOpen(true);
  };

  // Submit fixed slot
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    if (!formData.classId || !formData.workingDayId || !formData.timeSlotId) {
      setConflictError("Class, Working Day, and Time Slot are required.");
      return;
    }

    try {
      setSubmitting(true);
      if (editingItem) {
        await fixedSlotsService.update(editingItem.id, formData);
        toast.showToast("Fixed timetable slot updated successfully", "success");
      } else {
        await fixedSlotsService.create(formData);
        toast.showToast("Fixed timetable slot created successfully", "success");
      }
      setIsModalOpen(false);
      fetchFixedSlots();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Conflict detected or invalid configuration";
      setConflictError(msg);
      toast.showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete slot
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleteLoading(true);
      await fixedSlotsService.delete(deleteTarget.id);
      toast.showToast("Fixed slot deleted successfully", "success");
      setDeleteTarget(null);
      fetchFixedSlots();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Failed to delete slot", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Toggle faculty in multi-select
  const handleFacultyToggle = (facultyId: string) => {
    setFormData((prev) => {
      const current = prev.facultyIds || [];
      if (current.includes(facultyId)) {
        return { ...prev, facultyIds: current.filter((id) => id !== facultyId) };
      } else {
        return { ...prev, facultyIds: [...current, facultyId] };
      }
    });
  };

  // Quick lookup for grid view
  const gridSlotMap = useMemo(() => {
    const map: Record<string, FixedSlot> = {};
    fixedSlots.forEach((fs) => {
      if (fs.classId === filterClassId) {
        map[`${fs.workingDayId}_${fs.timeSlotId}`] = fs;
      }
    });
    return map;
  }, [fixedSlots, filterClassId]);

  // Table Columns
  const tableColumns: TableColumn<FixedSlot>[] = [
    {
      header: "Class",
      render: (item) => (
        <div>
          <div className="font-semibold text-slate-800">{item.className || "Class"}</div>
          <div className="text-[10px] text-slate-500">{item.classDisplayName}</div>
        </div>
      ),
    },
    {
      header: "Day & Time",
      render: (item) => (
        <div>
          <div className="font-medium text-slate-700">{item.dayName}</div>
          <div className="text-[10px] font-mono text-slate-500">
            {item.startTime} - {item.endTime}
          </div>
        </div>
      ),
    },
    {
      header: "Category",
      render: (item) => {
        const cat = CATEGORY_LABELS[item.slotCategory] || {
          label: item.slotCategory,
          color: "bg-slate-100 text-slate-700 border-slate-200",
        };
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cat.color}`}
          >
            {cat.label}
          </span>
        );
      },
    },
    {
      header: "Subject / Title",
      render: (item) => (
        <div>
          <div className="font-semibold text-slate-800">
            {item.subjectName || item.title || "Fixed Period"}
          </div>
          {item.subjectCode && (
            <div className="text-[10px] font-mono text-indigo-600">{item.subjectCode}</div>
          )}
        </div>
      ),
    },
    {
      header: "Faculty",
      render: (item) =>
        item.facultyNames && item.facultyNames.length > 0 ? (
          <span className="text-xs text-slate-700 font-medium">
            {item.facultyNames.join(", ")}
          </span>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        ),
    },
    {
      header: "Room / Lab",
      render: (item) =>
        item.resourceName ? (
          <span className="text-xs text-slate-700 font-medium">
            {item.resourceName} ({item.resourceCode})
          </span>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        ),
    },
    {
      header: "Locked",
      align: "center",
      render: (item) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
            item.isLocked
              ? "bg-rose-50 text-rose-700 border border-rose-200"
              : "bg-slate-50 text-slate-600 border border-slate-200"
          }`}
        >
          {item.isLocked ? (
            <>
              <Lock className="w-2.5 h-2.5 mr-1" /> Locked
            </>
          ) : (
            "Flexible"
          )}
        </span>
      ),
    },
    {
      header: "Actions",
      align: "right",
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenEdit(item)}
            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
            title="Edit Fixed Slot"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(item)}
            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
            title="Delete Fixed Slot"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Fixed / Locked Timetable Slots"
        description="Pin mandatory periods (Library, Seminars, Special Labs) that must remain static with immediate conflict prevention."
        breadcrumbs={[{ label: "Scheduler & Constraints" }, { label: "Fixed Slots" }]}
        actions={
          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveView("GRID")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  activeView === "GRID"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Grid View
              </button>
              <button
                type="button"
                onClick={() => setActiveView("TABLE")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  activeView === "TABLE"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                Table View
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAdd()}
              className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Fixed Slot
            </button>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Academic Year</label>
            <select
              value={filterYearId}
              onChange={(e) => setFilterYearId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.isCurrent ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Semester Type</label>
            <select
              value={filterSemTypeId}
              onChange={(e) => setFilterSemTypeId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {semesterTypes.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Class / Section</label>
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {activeView === "TABLE" && <option value="ALL">All Classes</option>}
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.displayName})
                </option>
              ))}
            </select>
          </div>

          {activeView === "TABLE" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Categories</option>
                {Object.entries(CATEGORY_LABELS).map(([cat, info]) => (
                  <option key={cat} value={cat}>
                    {info.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-end">
              <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200 w-full flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Click any empty cell to pin a new slot, or click a slot to edit.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: GRID VIEW */}
      {activeView === "GRID" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  <th className="py-3 px-4 w-40 min-w-40 border-r border-slate-200">Day / Period</th>
                  {teachingSlots.map((slot) => (
                    <th
                      key={slot.id}
                      className="py-3 px-3 text-center border-r border-slate-200 last:border-r-0 min-w-32"
                    >
                      <div>{slot.name}</div>
                      <div className="text-[10px] text-slate-500 font-normal font-mono mt-0.5">
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {loading ? (
                  <tr>
                    <td
                      colSpan={teachingSlots.length + 1}
                      className="py-12 text-center text-slate-400 font-medium"
                    >
                      Loading timetable grid...
                    </td>
                  </tr>
                ) : workingDays.length === 0 || teachingSlots.length === 0 ? (
                  <tr>
                    <td
                      colSpan={teachingSlots.length + 1}
                      className="py-12 text-center text-slate-400 font-medium"
                    >
                      No active working days or teaching periods configured.
                    </td>
                  </tr>
                ) : (
                  workingDays.map((day) => (
                    <tr key={day.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-4 font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/50">
                        <div>{day.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{day.shortName}</div>
                      </td>

                      {teachingSlots.map((slot) => {
                        const key = `${day.id}_${slot.id}`;
                        const item = gridSlotMap[key];

                        if (item) {
                          const cat = CATEGORY_LABELS[item.slotCategory] || {
                            label: item.slotCategory,
                            color: "bg-slate-50 text-slate-700 border-slate-200",
                          };
                          return (
                            <td
                              key={slot.id}
                              className="p-1.5 border-r border-slate-200 last:border-r-0 align-top"
                            >
                              <div
                                onClick={() => handleOpenEdit(item)}
                                className={`w-full p-2.5 rounded-lg border text-left cursor-pointer transition-all hover:shadow-xs hover:scale-[1.02] ${cat.color}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider">
                                    {cat.label}
                                  </span>
                                  {item.isLocked && <Lock className="w-3 h-3 text-rose-500" />}
                                </div>
                                <div className="font-bold text-slate-900 line-clamp-1">
                                  {item.subjectName || item.title || "Fixed Period"}
                                </div>
                                {item.facultyNames && item.facultyNames.length > 0 && (
                                  <div className="text-[10px] text-slate-600 line-clamp-1 mt-0.5">
                                    {item.facultyNames.join(", ")}
                                  </div>
                                )}
                                {item.resourceName && (
                                  <div className="text-[9px] font-mono text-slate-500 mt-1">
                                    Room: {item.resourceCode || item.resourceName}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={slot.id}
                            className="p-1.5 border-r border-slate-200 last:border-r-0 text-center"
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenAdd(day.id, slot.id)}
                              className="w-full h-16 rounded-lg border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-300 hover:text-indigo-600 flex flex-col items-center justify-center transition-all cursor-pointer group"
                            >
                              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              <span className="text-[9px] font-medium mt-0.5">Pin Slot</span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: TABLE VIEW */}
      {activeView === "TABLE" && (
        <DataTable
          columns={tableColumns}
          data={fixedSlots}
          keyExtractor={(item) => item.id}
          isLoading={loading}
          emptyTitle="No fixed slots found"
          emptyDescription="Pin periods using the 'Add Fixed Slot' button or via the Grid View."
        />
      )}

      {/* Modal: Add / Edit Fixed Slot */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "Edit Fixed Slot" : "Pin Timetable Slot"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Conflict Error Notice */}
          {conflictError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Conflict Alert:</strong> {conflictError}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Class *
              </label>
              <select
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.displayName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Slot Category *
              </label>
              <select
                value={formData.slotCategory}
                onChange={(e) =>
                  setFormData({ ...formData, slotCategory: e.target.value as FixedSlotCategory })
                }
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              >
                {Object.entries(CATEGORY_LABELS).map(([cat, info]) => (
                  <option key={cat} value={cat}>
                    {info.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Working Day *
              </label>
              <select
                value={formData.workingDayId}
                onChange={(e) => setFormData({ ...formData, workingDayId: e.target.value })}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              >
                {workingDays.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.shortName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Time Slot *
              </label>
              <select
                value={formData.timeSlotId}
                onChange={(e) => setFormData({ ...formData, timeSlotId: e.target.value })}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              >
                {teachingSlots.map((ts) => (
                  <option key={ts.id} value={ts.id}>
                    {ts.name} ({ts.startTime} - {ts.endTime})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional Subject Selection */}
          {formData.slotCategory === "SUBJECT" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
              <select
                value={formData.subjectId || ""}
                onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose Subject --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.subjectCode}) [{s.subjectType}]
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title and Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Title / Label
              </label>
              <input
                type="text"
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Operating Systems / Library"
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Facility / Room (Optional)
              </label>
              <select
                value={formData.resourceId || ""}
                onChange={(e) => setFormData({ ...formData, resourceId: e.target.value })}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- No Room Assigned --</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code}) [{r.resourceType}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Faculty Multi-Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assigned Faculty Member(s)
            </label>
            <div className="max-h-32 overflow-y-auto p-2 border border-slate-300 rounded-lg space-y-1.5 bg-slate-50/50">
              {facultyMembers.map((fac) => {
                const isSelected = (formData.facultyIds || []).includes(fac.id);
                return (
                  <label
                    key={fac.id}
                    className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? "bg-indigo-50 text-indigo-900 font-semibold"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleFacultyToggle(fac.id)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <span>
                      {fac.name} ({fac.facultyCode})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Lock toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <div className="text-xs font-bold text-slate-800">Lock Slot</div>
              <div className="text-[11px] text-slate-500">
                Locked slots cannot be relocated or displaced during timetable generation.
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.isLocked}
              onChange={(e) => setFormData({ ...formData, isLocked: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300"
            >
              {submitting ? "Checking Conflicts..." : editingItem ? "Update Slot" : "Pin Slot"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Fixed Slot"
        message={`Are you sure you want to remove the fixed slot '${deleteTarget?.title || deleteTarget?.slotCategory}'? This slot will become free for general allocation.`}
        confirmText="Delete"
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteLoading}
      />
    </AdminLayout>
  );
}
