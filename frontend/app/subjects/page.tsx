"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Edit2, Trash2, BookOpen, Filter, FlaskConical, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { FormField, Input, Select, Textarea, Toggle } from "@/components/FormFields";
import { useToast } from "@/components/Toast";
import { subjectsService } from "@/services/subjects";
import { programmesService } from "@/services/programmes";
import { semestersService } from "@/services/semesters";
import { Subject, SubjectFormData, Programme, Semester, TableColumn, PaginationMeta } from "@/types";

export default function SubjectsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Subject[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Master dropdowns
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [allSemesters, setAllSemesters] = useState<Semester[]>([]);

  // Filter toolbar state
  const [filterProgramme, setFilterProgramme] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Subject | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<SubjectFormData>({
    subjectCode: "",
    name: "",
    programmeId: "",
    semesterId: "",
    subjectType: "THEORY",
    defaultWeeklyHours: 4,
    defaultBlockSize: 1,
    requiresConsecutivePeriods: false,
    description: "",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete dialog states
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load master options
  const loadMasters = useCallback(async () => {
    try {
      const [prog, sem] = await Promise.all([
        programmesService.getAll({ limit: 100 }),
        semestersService.getAll(),
      ]);
      setProgrammes(prog.data || []);
      setAllSemesters(sem || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await subjectsService.getAll({
        page,
        limit: 10,
        search: search.trim() || undefined,
        programmeId: filterProgramme !== "ALL" ? filterProgramme : undefined,
        subjectType: filterType !== "ALL" ? filterType : undefined,
      });
      setData(res.data || []);
      setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterProgramme, filterType, toast]);

  useEffect(() => {
    loadMasters();
  }, [loadMasters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lookup maps
  const progMap = useMemo(() => new Map(programmes.map((p) => [p.id, p])), [programmes]);
  const semMap = useMemo(() => new Map(allSemesters.map((s) => [s.id, s])), [allSemesters]);

  // Modal available semesters
  const availableSemesters = useMemo(() => {
    if (!formData.programmeId) return allSemesters;
    return allSemesters.filter((s) => s.programmeId === formData.programmeId);
  }, [allSemesters, formData.programmeId]);

  const handleOpenCreate = () => {
    const defaultProg = programmes[0];
    const defaultSem = allSemesters.find((s) => s.programmeId === defaultProg?.id) || allSemesters[0];

    setEditingItem(null);
    setFormData({
      subjectCode: "",
      name: "",
      programmeId: defaultProg?.id || "",
      semesterId: defaultSem?.id || "",
      subjectType: "THEORY",
      defaultWeeklyHours: 4,
      defaultBlockSize: 1,
      requiresConsecutivePeriods: false,
      description: "",
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Subject) => {
    setEditingItem(item);
    setFormData({
      subjectCode: item.subjectCode,
      name: item.name,
      programmeId: item.programmeId,
      semesterId: item.semesterId,
      subjectType: item.subjectType,
      defaultWeeklyHours: item.defaultWeeklyHours,
      defaultBlockSize: item.defaultBlockSize,
      requiresConsecutivePeriods: item.requiresConsecutivePeriods,
      description: item.description || "",
      isActive: item.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleTypeChange = (type: string) => {
    const isLab = type === "LAB";
    setFormData((prev) => ({
      ...prev,
      subjectType: type,
      defaultBlockSize: isLab ? 2 : 1,
      requiresConsecutivePeriods: isLab,
      defaultWeeklyHours: isLab ? Math.max(prev.defaultWeeklyHours, 2) : prev.defaultWeeklyHours,
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.subjectCode.trim()) errors.subjectCode = "Subject code is required (e.g. CS101)";
    if (!formData.name.trim()) errors.name = "Subject name is required";
    if (!formData.programmeId) errors.programmeId = "Programme is required";
    if (!formData.semesterId) errors.semesterId = "Semester is required";
    if (formData.defaultWeeklyHours <= 0 || formData.defaultWeeklyHours > 40) {
      errors.defaultWeeklyHours = "Weekly hours must be between 1 and 40";
    }
    if (formData.defaultBlockSize <= 0 || formData.defaultBlockSize > 6) {
      errors.defaultBlockSize = "Block size must be between 1 and 6";
    }
    if (formData.requiresConsecutivePeriods && formData.defaultBlockSize <= 1) {
      errors.defaultBlockSize = "Consecutive sessions require a block size of at least 2";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload: SubjectFormData = {
        subjectCode: formData.subjectCode.trim().toUpperCase(),
        name: formData.name.trim(),
        programmeId: formData.programmeId,
        semesterId: formData.semesterId,
        subjectType: formData.subjectType,
        defaultWeeklyHours: Number(formData.defaultWeeklyHours),
        defaultBlockSize: Number(formData.defaultBlockSize),
        requiresConsecutivePeriods: formData.requiresConsecutivePeriods,
        description: formData.description?.trim() || undefined,
        isActive: formData.isActive,
      };

      if (editingItem) {
        await subjectsService.update(editingItem.id, payload);
        toast.success("Subject updated successfully");
      } else {
        await subjectsService.create(payload);
        toast.success("Subject created successfully");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || "Operation failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      await subjectsService.delete(deleteTarget.id);
      toast.success("Subject deleted successfully");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Cannot delete subject. It has active faculty allocations or timetable entries.";
      setDeleteError(errorMsg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: TableColumn<Subject>[] = [
    {
      header: "Code",
      accessor: "subjectCode",
      className: "w-28",
      cell: (item) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
          {item.subjectCode}
        </span>
      ),
    },
    {
      header: "Subject Title",
      accessor: "name",
      className: "font-semibold text-slate-900",
      cell: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.name}</span>
          {item.description && (
            <p className="text-[11px] text-slate-400 truncate max-w-sm">{item.description}</p>
          )}
        </div>
      ),
    },
    {
      header: "Programme & Semester",
      accessor: "programmeId",
      cell: (item) => {
        const p = progMap.get(item.programmeId);
        const s = semMap.get(item.semesterId);
        return (
          <div className="text-xs">
            <span className="font-semibold text-slate-800">{p?.code || item.programmeName || "—"}</span>
            <span className="text-slate-400 ml-1.5 font-normal">
              Sem {s?.semesterNumber || item.semesterName || "—"}
            </span>
          </div>
        );
      },
    },
    {
      header: "Subject Type",
      accessor: "subjectType",
      cell: (item) => <StatusBadge type={item.subjectType} />,
    },
    {
      header: "Hours & Block Size",
      accessor: "defaultWeeklyHours",
      cell: (item) => (
        <div className="text-xs text-slate-700">
          <span className="font-semibold">{item.defaultWeeklyHours} hrs/wk</span>
          <span className="text-slate-400 ml-1 font-normal">
            ({item.defaultBlockSize} {item.defaultBlockSize > 1 ? "consec periods" : "period"})
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: "isActive",
      cell: (item) => <StatusBadge isActive={item.isActive} />,
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (item) => (
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => handleOpenEdit(item)}
            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setDeleteTarget(item);
              setDeleteError(null);
            }}
            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Subjects & Courses"
        description="Configure theory lectures, laboratory practicums, weekly hours, and consecutive period requirements."
        breadcrumbs={[{ label: "Academic Structure" }, { label: "Subjects" }]}
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleOpenCreate}
              disabled={programmes.length === 0 || allSemesters.length === 0}
              className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Subject
            </button>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Filters:</span>
        </div>

        {/* Programme Filter */}
        <select
          value={filterProgramme}
          onChange={(e) => {
            setFilterProgramme(e.target.value);
            setPage(1);
          }}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">All Programmes</option>
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.name}
            </option>
          ))}
        </select>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setPage(1);
          }}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">All Subject Types</option>
          <option value="THEORY">Theory</option>
          <option value="LAB">Laboratory</option>
          <option value="TUTORIAL">Tutorial</option>
        </select>
      </div>

      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Search by subject code, title..."
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        isLoading={loading}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        emptyTitle="No Subjects Found"
        emptyDescription="Define theory and laboratory courses to allocate faculty and schedule weekly timetable slots."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingItem ? "Edit Subject" : "Add Subject"}
        description="Configure course credits, type, and continuous period block sizes."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Programme" required error={formErrors.programmeId}>
              <Select
                value={formData.programmeId}
                onChange={(e) => {
                  const progId = e.target.value;
                  const semList = allSemesters.filter((s) => s.programmeId === progId);
                  setFormData((prev) => ({
                    ...prev,
                    programmeId: progId,
                    semesterId: semList[0]?.id || "",
                  }));
                }}
              >
                <option value="">Select Programme...</option>
                {programmes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Semester" required error={formErrors.semesterId}>
              <Select
                value={formData.semesterId}
                disabled={!formData.programmeId}
                onChange={(e) => setFormData({ ...formData, semesterId: e.target.value })}
              >
                <option value="">Select Semester...</option>
                {availableSemesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    Semester {s.semesterNumber} ({s.name})
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <FormField label="Subject Code" required error={formErrors.subjectCode} hint="e.g. CS501">
                <Input
                  type="text"
                  value={formData.subjectCode}
                  onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value.toUpperCase() })}
                  placeholder="CS501"
                />
              </FormField>
            </div>

            <div className="sm:col-span-2">
              <FormField label="Subject Title" required error={formErrors.name}>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Advanced Operating Systems"
                />
              </FormField>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Subject Type" required>
              <Select
                value={formData.subjectType}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="THEORY">Theory (Lecture)</option>
                <option value="LAB">Laboratory (Practical)</option>
                <option value="TUTORIAL">Tutorial (Discussion)</option>
                <option value="OTHER">Other Academic</option>
              </Select>
            </FormField>

            <FormField
              label="Weekly Hours (Periods)"
              required
              error={formErrors.defaultWeeklyHours}
              hint="Total periods per week"
            >
              <Input
                type="number"
                value={formData.defaultWeeklyHours}
                onChange={(e) => setFormData({ ...formData, defaultWeeklyHours: parseInt(e.target.value) || 1 })}
                min={1}
                max={40}
              />
            </FormField>

            <FormField
              label="Session Block Size"
              required
              error={formErrors.defaultBlockSize}
              hint="Continuous periods per session"
            >
              <Input
                type="number"
                value={formData.defaultBlockSize}
                onChange={(e) => setFormData({ ...formData, defaultBlockSize: parseInt(e.target.value) || 1 })}
                min={1}
                max={6}
              />
            </FormField>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <Toggle
              label="Requires Consecutive Periods"
              description="Keep period sessions clustered back-to-back (e.g. 2-3 hour practical lab sessions)."
              checked={formData.requiresConsecutivePeriods || false}
              onChange={(val) => setFormData({ ...formData, requiresConsecutivePeriods: val })}
            />
          </div>

          <FormField label="Description" hint="Optional course syllabus syllabus notes">
            <Textarea
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Prerequisites, laboratory lab requirements..."
            />
          </FormField>

          <div className="pt-2 border-t border-slate-100">
            <Toggle
              label="Active Status"
              description="Inactive subjects will not be offered in faculty allocation."
              checked={formData.isActive ?? true}
              onChange={(val) => setFormData({ ...formData, isActive: val })}
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingItem ? "Update Subject" : "Create Subject"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Subject"
        message={`Are you sure you want to delete "${deleteTarget?.name}" (${deleteTarget?.subjectCode})?`}
        confirmText="Delete Subject"
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        isLoading={deleteLoading}
        error={deleteError}
      />
    </AdminLayout>
  );
}
