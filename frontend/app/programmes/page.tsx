"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, GraduationCap, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { FormField, Input, Textarea, Toggle } from "@/components/FormFields";
import { useToast } from "@/components/Toast";
import { programmesService } from "@/services/programmes";
import { Programme, ProgrammeFormData, TableColumn, PaginationMeta } from "@/types";

export default function ProgrammesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Programme[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Programme | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ProgrammeFormData>({
    name: "",
    code: "",
    shortName: "",
    totalSemesters: 4,
    description: "",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete dialog states
  const [deleteTarget, setDeleteTarget] = useState<Programme | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await programmesService.getAll({
        page,
        limit: 10,
        search: search.trim() || undefined,
      });
      setData(res.data || []);
      setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load programmes");
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      code: "",
      shortName: "",
      totalSemesters: 4,
      description: "",
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Programme) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code,
      shortName: item.shortName,
      totalSemesters: item.totalSemesters,
      description: item.description || "",
      isActive: item.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Programme name is required";
    if (!formData.code.trim()) errors.code = "Programme code is required (e.g. MCA)";
    if (!formData.shortName.trim()) errors.shortName = "Short name is required";
    if (!formData.totalSemesters || formData.totalSemesters < 1 || formData.totalSemesters > 16) {
      errors.totalSemesters = "Total semesters must be between 1 and 16";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload: ProgrammeFormData = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        shortName: formData.shortName.trim().toUpperCase(),
        totalSemesters: Number(formData.totalSemesters),
        description: formData.description?.trim() || undefined,
        isActive: formData.isActive,
      };

      if (editingItem) {
        await programmesService.update(editingItem.id, payload);
        toast.success("Programme updated successfully");
      } else {
        await programmesService.create(payload);
        toast.success("Programme created successfully");
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
      await programmesService.delete(deleteTarget.id);
      toast.success("Programme deleted successfully");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Cannot delete programme. It is referenced by active semesters, classes, or subjects.";
      setDeleteError(errorMsg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: TableColumn<Programme>[] = [
    {
      header: "Code",
      accessor: "code",
      className: "w-28",
      cell: (item) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
          {item.code}
        </span>
      ),
    },
    {
      header: "Programme Name",
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
      header: "Short Name",
      accessor: "shortName",
      className: "text-slate-600 font-mono text-xs",
    },
    {
      header: "Duration",
      accessor: "totalSemesters",
      cell: (item) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
          {item.totalSemesters} Semesters
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
        title="Degree Programmes"
        description="Manage academic degree courses, such as MCA, M.Sc Computer Science, and B.Tech."
        breadcrumbs={[{ label: "Academic Structure" }, { label: "Programmes" }]}
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
              className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Programme
            </button>
          </div>
        }
      />

      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Search by name, code..."
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        isLoading={loading}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        emptyTitle="No Programmes Found"
        emptyDescription="Add degree programmes to start configuring semesters, subjects, and timetable cohorts."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingItem ? "Edit Programme" : "Add Programme"}
        description="Configure academic programme parameters and semester counts."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Programme Code" required error={formErrors.code} hint="e.g. MCA, MSC-CS">
              <Input
                type="text"
                value={formData.code}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setFormData((prev) => ({
                    ...prev,
                    code: val,
                    shortName: prev.shortName || val,
                  }));
                }}
                placeholder="MCA"
              />
            </FormField>

            <FormField label="Short Name / Acronym" required error={formErrors.shortName}>
              <Input
                type="text"
                value={formData.shortName}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
                placeholder="MCA"
              />
            </FormField>
          </div>

          <FormField label="Full Programme Name" required error={formErrors.name} hint="Official degree title">
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Master of Computer Applications"
            />
          </FormField>

          <FormField
            label="Total Semesters"
            required
            error={formErrors.totalSemesters}
            hint="Number of semesters in this degree (e.g. 4 for 2-year postgraduate, 8 for 4-year undergraduate)"
          >
            <Input
              type="number"
              value={formData.totalSemesters}
              onChange={(e) => setFormData({ ...formData, totalSemesters: parseInt(e.target.value) || 1 })}
              min={1}
              max={16}
            />
          </FormField>

          <FormField label="Description" hint="Optional description or department notes">
            <Textarea
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Department of Computer Science & Applications..."
            />
          </FormField>

          <div className="pt-2 border-t border-slate-100">
            <Toggle
              label="Active Status"
              description="Inactive programmes are excluded from semester creation and course allocations."
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
              {submitting ? "Saving..." : editingItem ? "Update Programme" : "Create Programme"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Programme"
        message={`Are you sure you want to delete "${deleteTarget?.name}" (${deleteTarget?.code})?`}
        confirmText="Delete Programme"
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
