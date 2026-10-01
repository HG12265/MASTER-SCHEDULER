"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Layers, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { FormField, Input, Textarea, Toggle, Select } from "@/components/FormFields";
import { useToast } from "@/components/Toast";
import { semesterTypesService } from "@/services/semesterTypes";
import { SemesterType, SemesterTypeFormData, TableColumn } from "@/types";

export default function SemesterTypesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SemesterType[]>([]);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SemesterType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<SemesterTypeFormData>({
    name: "",
    code: "ODD",
    description: "",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete dialog states
  const [deleteTarget, setDeleteTarget] = useState<SemesterType | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await semesterTypesService.getAll();
      setData(res || []);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load semester types");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      code: "ODD",
      description: "",
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: SemesterType) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code,
      description: item.description || "",
      isActive: item.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Semester type name is required (e.g. Odd Semester)";
    if (!formData.code.trim()) errors.code = "Semester type code is required (e.g. ODD)";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload: SemesterTypeFormData = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description?.trim() || undefined,
        isActive: formData.isActive,
      };

      if (editingItem) {
        await semesterTypesService.update(editingItem.id, payload);
        toast.success("Semester type updated successfully");
      } else {
        await semesterTypesService.create(payload);
        toast.success("Semester type created successfully");
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
      await semesterTypesService.delete(deleteTarget.id);
      toast.success("Semester type deleted successfully");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Cannot delete semester type. It is referenced by active semesters or classes.";
      setDeleteError(errorMsg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: TableColumn<SemesterType>[] = [
    {
      header: "Code",
      accessor: "code",
      className: "w-28",
      cell: (item) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono tracking-wider ${
            item.code === "ODD"
              ? "bg-purple-100 text-purple-800 border border-purple-200"
              : item.code === "EVEN"
              ? "bg-blue-100 text-blue-800 border border-blue-200"
              : "bg-slate-100 text-slate-800 border border-slate-200"
          }`}
        >
          {item.code}
        </span>
      ),
    },
    {
      header: "Semester Type Name",
      accessor: "name",
      className: "font-semibold text-slate-900",
      cell: (item) => <span className="font-semibold text-slate-900">{item.name}</span>,
    },
    {
      header: "Description",
      accessor: "description",
      cell: (item) => (
        <span className="text-slate-500 text-xs truncate max-w-xs block">
          {item.description || "—"}
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
        title="Semester Types"
        description="Configure academic terms such as ODD and EVEN semesters to organize academic schedules."
        breadcrumbs={[{ label: "Calendar & Timing" }, { label: "Semester Types" }]}
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
              Add Semester Type
            </button>
          </div>
        }
      />

      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Search semester type..."
        searchableKey="name"
        isLoading={loading}
        emptyTitle="No Semester Types Found"
        emptyDescription="Create standard semester cycles (e.g. ODD and EVEN) to categorize semester terms."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingItem ? "Edit Semester Type" : "Add Semester Type"}
        description="Define term classification used across courses and allocations."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <FormField label="Type Code" required error={formErrors.code} hint="e.g. ODD, EVEN">
                <Input
                  type="text"
                  value={formData.code}
                  onChange={(e) => {
                    const c = e.target.value.toUpperCase();
                    setFormData((prev) => ({
                      ...prev,
                      code: c,
                      name: prev.name || (c === "ODD" ? "Odd Semester" : c === "EVEN" ? "Even Semester" : prev.name),
                    }));
                  }}
                  placeholder="ODD"
                  maxLength={10}
                />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField label="Full Name" required error={formErrors.name} hint="e.g. Odd Semester (I, III, V)">
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Odd Semester"
                />
              </FormField>
            </div>
          </div>

          <FormField label="Description" hint="Optional notes about this academic term">
            <Textarea
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Applies to Semesters 1, 3, 5 and 7..."
            />
          </FormField>

          <div className="pt-2 border-t border-slate-100">
            <Toggle
              label="Active Status"
              description="Controls whether this semester type is selectable in timetable planning."
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
              {submitting ? "Saving..." : editingItem ? "Update Type" : "Create Type"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Semester Type"
        message={`Are you sure you want to delete "${deleteTarget?.name}" (${deleteTarget?.code})? This action cannot be undone.`}
        confirmText="Delete Type"
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
