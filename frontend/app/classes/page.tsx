"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Edit2, Trash2, School, Filter, Users, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { FormField, Input, Select, Toggle } from "@/components/FormFields";
import { useToast } from "@/components/Toast";
import { classesService } from "@/services/classes";
import { academicYearsService } from "@/services/academicYears";
import { semesterTypesService } from "@/services/semesterTypes";
import { programmesService } from "@/services/programmes";
import { semestersService } from "@/services/semesters";
import {
  ClassEntity,
  ClassFormData,
  AcademicYear,
  SemesterType,
  Programme,
  Semester,
  TableColumn,
  PaginationMeta,
} from "@/types";

export default function ClassesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ClassEntity[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Master options for dropdowns
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesterTypes, setSemesterTypes] = useState<SemesterType[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [allSemesters, setAllSemesters] = useState<Semester[]>([]);

  // Filter Bar state
  const [filterYear, setFilterYear] = useState<string>("ALL");
  const [filterSemType, setFilterSemType] = useState<string>("ALL");
  const [filterProg, setFilterProg] = useState<string>("ALL");

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClassEntity | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ClassFormData>({
    name: "",
    displayName: "",
    programmeId: "",
    semesterId: "",
    academicYearId: "",
    semesterTypeId: "",
    section: "A",
    studentStrength: 60,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete dialog states
  const [deleteTarget, setDeleteTarget] = useState<ClassEntity | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load dropdown masters
  const loadMasters = useCallback(async () => {
    try {
      const [ay, st, prog, sem] = await Promise.all([
        academicYearsService.getAll(),
        semesterTypesService.getAll(),
        programmesService.getAll({ limit: 100 }),
        semestersService.getAll(),
      ]);
      setAcademicYears(ay || []);
      setSemesterTypes(st || []);
      setProgrammes(prog.data || []);
      setAllSemesters(sem || []);
    } catch {
      // master load fallback
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await classesService.getAll({
        page,
        limit: 10,
        search: search.trim() || undefined,
        academicYearId: filterYear !== "ALL" ? filterYear : undefined,
        semesterTypeId: filterSemType !== "ALL" ? filterSemType : undefined,
        programmeId: filterProg !== "ALL" ? filterProg : undefined,
      });
      setData(res.data || []);
      setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load classes");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterYear, filterSemType, filterProg, toast]);

  useEffect(() => {
    loadMasters();
  }, [loadMasters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lookup maps
  const progMap = useMemo(() => new Map(programmes.map((p) => [p.id, p])), [programmes]);
  const semMap = useMemo(() => new Map(allSemesters.map((s) => [s.id, s])), [allSemesters]);
  const ayMap = useMemo(() => new Map(academicYears.map((y) => [y.id, y])), [academicYears]);
  const stMap = useMemo(() => new Map(semesterTypes.map((t) => [t.id, t])), [semesterTypes]);

  // Dependent semesters available in Modal based on selected programme
  const availableSemesters = useMemo(() => {
    if (!formData.programmeId) return allSemesters;
    return allSemesters.filter((s) => s.programmeId === formData.programmeId);
  }, [allSemesters, formData.programmeId]);

  // Auto-generator for class names
  const updateNames = (progId: string, semId: string, section?: string) => {
    const prog = progMap.get(progId);
    const sem = semMap.get(semId);
    const sec = section?.trim().toUpperCase() || "";

    if (prog && sem) {
      const codePart = `${prog.code}-Sem${sem.semesterNumber}`;
      const name = sec ? `${codePart}-Sec${sec}` : codePart;
      const displayName = sec
        ? `${prog.name} Semester ${sem.semesterNumber} - Section ${sec}`
        : `${prog.name} Semester ${sem.semesterNumber}`;
      return { name, displayName };
    }
    return { name: "", displayName: "" };
  };

  const handleOpenCreate = () => {
    const currentAy = academicYears.find((y) => y.isCurrent) || academicYears[0];
    const defaultSt = semesterTypes[0];
    const defaultProg = programmes[0];
    const defaultSem = allSemesters.find((s) => s.programmeId === defaultProg?.id) || allSemesters[0];

    const initialProgId = defaultProg?.id || "";
    const initialSemId = defaultSem?.id || "";
    const initialSec = "A";
    const generated = updateNames(initialProgId, initialSemId, initialSec);

    setEditingItem(null);
    setFormData({
      academicYearId: currentAy?.id || "",
      semesterTypeId: defaultSt?.id || "",
      programmeId: initialProgId,
      semesterId: initialSemId,
      section: initialSec,
      name: generated.name || "Class-1",
      displayName: generated.displayName || "Class 1",
      studentStrength: 60,
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ClassEntity) => {
    setEditingItem(item);
    setFormData({
      academicYearId: item.academicYearId,
      semesterTypeId: item.semesterTypeId,
      programmeId: item.programmeId,
      semesterId: item.semesterId,
      section: item.section || "",
      name: item.name,
      displayName: item.displayName,
      studentStrength: item.studentStrength,
      isActive: item.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.academicYearId) errors.academicYearId = "Academic Year is required";
    if (!formData.semesterTypeId) errors.semesterTypeId = "Semester Type is required";
    if (!formData.programmeId) errors.programmeId = "Programme is required";
    if (!formData.semesterId) errors.semesterId = "Semester is required";
    if (!formData.name.trim()) errors.name = "Class identifier is required";
    if (!formData.displayName.trim()) errors.displayName = "Display name is required";
    if (formData.studentStrength < 0) errors.studentStrength = "Student strength cannot be negative";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload: ClassFormData = {
        name: formData.name.trim(),
        displayName: formData.displayName.trim(),
        programmeId: formData.programmeId,
        semesterId: formData.semesterId,
        academicYearId: formData.academicYearId,
        semesterTypeId: formData.semesterTypeId,
        section: formData.section ? formData.section.trim().toUpperCase() : undefined,
        studentStrength: Number(formData.studentStrength) || 0,
        isActive: formData.isActive,
      };

      if (editingItem) {
        await classesService.update(editingItem.id, payload);
        toast.success("Class updated successfully");
      } else {
        await classesService.create(payload);
        toast.success("Class created successfully");
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
      await classesService.delete(deleteTarget.id);
      toast.success("Class deleted successfully");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Cannot delete class. It is linked to faculty allocations or timetable records.";
      setDeleteError(errorMsg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: TableColumn<ClassEntity>[] = [
    {
      header: "Class Name",
      accessor: "name",
      className: "font-semibold text-slate-900",
      cell: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.name}</span>
          <span className="text-[11px] text-slate-400 block font-normal">{item.displayName}</span>
        </div>
      ),
    },
    {
      header: "Section",
      accessor: "section",
      className: "w-20 text-center",
      cell: (item) => (
        item.section ? (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-mono text-xs font-bold border border-slate-200">
            {item.section}
          </span>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        )
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
            <span className="font-semibold text-indigo-700">{p?.code || item.programmeName || "—"}</span>
            <span className="text-slate-500 ml-1.5 font-normal">
              Sem {s?.semesterNumber || item.semesterName || "—"}
            </span>
          </div>
        );
      },
    },
    {
      header: "Academic Term",
      accessor: "academicYearId",
      cell: (item) => {
        const ay = ayMap.get(item.academicYearId);
        const st = stMap.get(item.semesterTypeId);
        return (
          <div className="text-xs text-slate-600">
            <span className="font-mono">{ay?.name || item.academicYearName || "—"}</span>
            <span className="mx-1 text-slate-300">•</span>
            <span className="font-semibold">{st?.code || item.semesterTypeName || "—"}</span>
          </div>
        );
      },
    },
    {
      header: "Students",
      accessor: "studentStrength",
      cell: (item) => (
        <span className="inline-flex items-center text-xs text-slate-600">
          <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
          {item.studentStrength}
        </span>
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
        title="Class Cohorts & Sections"
        description="Configure student groups, academic terms, and cohort strength for timetable generation."
        breadcrumbs={[{ label: "Academic Structure" }, { label: "Classes" }]}
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
              Add Class
            </button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Filters:</span>
        </div>

        {/* Academic Year Filter */}
        <select
          value={filterYear}
          onChange={(e) => {
            setFilterYear(e.target.value);
            setPage(1);
          }}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">All Academic Years</option>
          {academicYears.map((ay) => (
            <option key={ay.id} value={ay.id}>
              {ay.name} {ay.isCurrent ? "(Current)" : ""}
            </option>
          ))}
        </select>

        {/* Semester Type Filter */}
        <select
          value={filterSemType}
          onChange={(e) => {
            setFilterSemType(e.target.value);
            setPage(1);
          }}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">All Term Types</option>
          {semesterTypes.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name} ({st.code})
            </option>
          ))}
        </select>

        {/* Programme Filter */}
        <select
          value={filterProg}
          onChange={(e) => {
            setFilterProg(e.target.value);
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
      </div>

      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Search by class name, section..."
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        isLoading={loading}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        emptyTitle="No Classes Found"
        emptyDescription="Create student cohort classes to allocate faculty, subjects, and generate timetables."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingItem ? "Edit Class" : "Add Class"}
        description="Set up class cohort, section, and enrolled strength."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Academic Year" required error={formErrors.academicYearId}>
              <Select
                value={formData.academicYearId}
                onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
              >
                <option value="">Select Academic Year...</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name} {ay.isCurrent ? "(Current Year)" : ""}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Semester Term Type" required error={formErrors.semesterTypeId}>
              <Select
                value={formData.semesterTypeId}
                onChange={(e) => setFormData({ ...formData, semesterTypeId: e.target.value })}
              >
                <option value="">Select Term Type...</option>
                {semesterTypes.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.code})
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <FormField label="Programme" required error={formErrors.programmeId}>
                <Select
                  value={formData.programmeId}
                  onChange={(e) => {
                    const progId = e.target.value;
                    const semList = allSemesters.filter((s) => s.programmeId === progId);
                    const defaultSem = semList[0]?.id || "";
                    const gen = updateNames(progId, defaultSem, formData.section);
                    setFormData((prev) => ({
                      ...prev,
                      programmeId: progId,
                      semesterId: defaultSem,
                      name: gen.name || prev.name,
                      displayName: gen.displayName || prev.displayName,
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
            </div>

            <div className="sm:col-span-1">
              <FormField label="Semester" required error={formErrors.semesterId}>
                <Select
                  value={formData.semesterId}
                  disabled={!formData.programmeId}
                  onChange={(e) => {
                    const semId = e.target.value;
                    const gen = updateNames(formData.programmeId, semId, formData.section);
                    setFormData((prev) => ({
                      ...prev,
                      semesterId: semId,
                      name: gen.name || prev.name,
                      displayName: gen.displayName || prev.displayName,
                    }));
                  }}
                >
                  <option value="">Select Semester...</option>
                  {availableSemesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      Semester {s.semesterNumber}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <FormField label="Section" hint="Optional (e.g. A, B)">
                <Input
                  type="text"
                  value={formData.section || ""}
                  onChange={(e) => {
                    const sec = e.target.value.toUpperCase();
                    const gen = updateNames(formData.programmeId, formData.semesterId, sec);
                    setFormData((prev) => ({
                      ...prev,
                      section: sec,
                      name: gen.name || prev.name,
                      displayName: gen.displayName || prev.displayName,
                    }));
                  }}
                  placeholder="A"
                  maxLength={5}
                />
              </FormField>
            </div>

            <div className="sm:col-span-1">
              <FormField label="Student Strength" error={formErrors.studentStrength} hint="Workstations / seats">
                <Input
                  type="number"
                  value={formData.studentStrength}
                  onChange={(e) => setFormData({ ...formData, studentStrength: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </FormField>
            </div>

            <div className="sm:col-span-1">
              <FormField label="Class Code" required error={formErrors.name} hint="System identifier">
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. MCA-Sem1-SecA"
                />
              </FormField>
            </div>
          </div>

          <FormField label="Full Display Name" required error={formErrors.displayName}>
            <Input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="e.g. Master of Computer Applications Semester 1 - Section A"
            />
          </FormField>

          <div className="pt-2 border-t border-slate-100">
            <Toggle
              label="Active Status"
              description="Inactive classes will not have timetables generated."
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
              {submitting ? "Saving..." : editingItem ? "Update Class" : "Create Class"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Class"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All assigned subject allocations will be permanently lost.`}
        confirmText="Delete Class"
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
