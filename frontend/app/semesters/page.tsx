"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Edit2, Trash2, ListOrdered, Filter, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { FormField, Input, Select, Toggle } from "@/components/FormFields";
import { useToast } from "@/components/Toast";
import { semestersService } from "@/services/semesters";
import { programmesService } from "@/services/programmes";
import { Semester, SemesterFormData, Programme, TableColumn } from "@/types";

export default function SemestersPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Semester[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>("ALL");

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Semester | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<SemesterFormData>({
    programmeId: "",
    semesterNumber: 1,
    name: "Semester 1",
    displayName: "Semester 1",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete dialog states
  const [deleteTarget, setDeleteTarget] = useState<Semester | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch programmes once
  const loadProgrammes = useCallback(async () => {
    try {
      const res = await programmesService.getAll({ limit: 100 });
      setProgrammes(res.data || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = selectedProgrammeId !== "ALL" ? { programmeId: selectedProgrammeId } : undefined;
      const res = await semestersService.getAll(params);
      setData(res || []);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load semesters");
    } finally {
      setLoading(false);
    }
  }, [selectedProgrammeId, toast]);

  useEffect(() => {
    loadProgrammes();
  }, [loadProgrammes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Programme map for easy lookup
  const programmeMap = useMemo(() => {
    const map = new Map<string, Programme>();
    programmes.forEach((p) => map.set(p.id, p));
    return map;
  }, [programmes]);

  const handleOpenCreate = () => {
    const defaultProgId = selectedProgrammeId !== "ALL" ? selectedProgrammeId : programmes[0]?.id || "";
    const prog = programmeMap.get(defaultProgId);
    setEditingItem(null);
    setFormData({
      programmeId: defaultProgId,
      semesterNumber: 1,
      name: "Semester 1",
      displayName: prog ? `${prog.code} Semester 1` : "Semester 1",
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Semester) => {
    setEditingItem(item);
    setFormData({
      programmeId: item.programmeId,
      semesterNumber: item.semesterNumber,
      name: item.name,
      displayName: item.displayName,
      isActive: item.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleProgrammeChange = (progId: string) => {
    const prog = programmeMap.get(progId);
    setFormData((prev) => ({
      ...prev,
      programmeId: progId,
      displayName: prog ? `${prog.code} ${prev.name}` : prev.name,
    }));
  };

  const handleSemesterNumberChange = (num: number) => {
    const prog = programmeMap.get(formData.programmeId);
    const semName = `Semester ${num}`;
    setFormData((prev) => ({
      ...prev,
      semesterNumber: num,
      name: semName,
      displayName: prog ? `${prog.code} ${semName}` : semName,
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.programmeId) errors.programmeId = "Please select a programme";
    if (!formData.semesterNumber || formData.semesterNumber < 1) {
      errors.semesterNumber = "Semester number must be 1 or higher";
    }
    if (!formData.name.trim()) errors.name = "Semester name is required";
    if (!formData.displayName.trim()) errors.displayName = "Display name is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload: SemesterFormData = {
        programmeId: formData.programmeId,
        semesterNumber: Number(formData.semesterNumber),
        name: formData.name.trim(),
        displayName: formData.displayName.trim(),
        isActive: formData.isActive,
      };

      if (editingItem) {
        await semestersService.update(editingItem.id, payload);
        toast.success("Semester updated successfully");
      } else {
        await semestersService.create(payload);
        toast.success("Semester created successfully");
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
      await semestersService.delete(deleteTarget.id);
      toast.success("Semester deleted successfully");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Cannot delete semester. It is in use by classes or subjects.";
      setDeleteError(errorMsg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: TableColumn<Semester>[] = [
    {
      header: "Programme",
      accessor: "programmeId",
      cell: (item) => {
        const prog = programmeMap.get(item.programmeId);
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
            {prog ? prog.code : item.programmeCode || "PROG"}
          </span>
        );
      },
    },
    {
      header: "Semester Number",
      accessor: "semesterNumber",
      className: "w-36",
      cell: (item) => (
        <span className="inline-flex items-center text-xs font-semibold text-slate-900">
          Semester {item.semesterNumber}
        </span>
      ),
    },
    {
      header: "Display Title",
      accessor: "displayName",
      className: "font-semibold text-slate-900",
      cell: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.displayName}</span>
          <span className="text-[11px] text-slate-400 block font-normal">{item.name}</span>
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
        title="Semesters"
        description="Organize degree stages into sequential semesters for curriculum and class planning."
        breadcrumbs={[{ label: "Academic Structure" }, { label: "Semesters" }]}
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
              disabled={programmes.length === 0}
              className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Semester
            </button>
          </div>
        }
      />

      {/* Filter by Programme */}
      <div className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-700">Filter by Programme:</span>
        <select
          value={selectedProgrammeId}
          onChange={(e) => setSelectedProgrammeId(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">All Programmes ({programmes.length})</option>
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
        searchPlaceholder="Search semester..."
        searchableKey="displayName"
        isLoading={loading}
        emptyTitle="No Semesters Found"
        emptyDescription="Create semesters within your degree programmes to attach courses and classes."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingItem ? "Edit Semester" : "Add Semester"}
        description="Attach semester stage to an existing academic programme."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Academic Programme" required error={formErrors.programmeId}>
            <Select
              value={formData.programmeId}
              onChange={(e) => handleProgrammeChange(e.target.value)}
              disabled={!!editingItem}
            >
              <option value="">Select Programme...</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name} (Max {p.totalSemesters} Semesters)
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Semester Number" required error={formErrors.semesterNumber}>
              <Input
                type="number"
                value={formData.semesterNumber}
                onChange={(e) => handleSemesterNumberChange(parseInt(e.target.value) || 1)}
                min={1}
                max={16}
              />
            </FormField>

            <FormField label="Internal Name" required error={formErrors.name} hint="e.g. Semester 1">
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Semester 1"
              />
            </FormField>
          </div>

          <FormField
            label="Display Title"
            required
            error={formErrors.displayName}
            hint="Format shown in timetables and student reports"
          >
            <Input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="e.g. MCA Semester 1"
            />
          </FormField>

          <div className="pt-2 border-t border-slate-100">
            <Toggle
              label="Active Status"
              description="Whether this semester is actively scheduled."
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
              {submitting ? "Saving..." : editingItem ? "Update Semester" : "Create Semester"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Semester"
        message={`Are you sure you want to delete "${deleteTarget?.displayName}"?`}
        confirmText="Delete Semester"
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
