"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Calendar, Star, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { FormField, Input, Toggle } from "@/components/FormFields";
import { useToast } from "@/components/Toast";
import { academicYearsService } from "@/services/academicYears";
import { AcademicYear, AcademicYearFormData, TableColumn } from "@/types";

export default function AcademicYearsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AcademicYear[]>([]);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AcademicYear | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<AcademicYearFormData>({
    name: "",
    startYear: new Date().getFullYear(),
    endYear: new Date().getFullYear() + 1,
    isCurrent: false,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete dialog states
  const [deleteTarget, setDeleteTarget] = useState<AcademicYear | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Set Current dialog states
  const [currentCandidate, setCurrentCandidate] = useState<AcademicYear | null>(null);
  const [currentLoading, setCurrentLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await academicYearsService.getAll();
      setData(res || []);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load academic years");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open modal for Create
  const handleOpenCreate = () => {
    const currentYear = new Date().getFullYear();
    setEditingItem(null);
    setFormData({
      name: `${currentYear}-${currentYear + 1}`,
      startYear: currentYear,
      endYear: currentYear + 1,
      isCurrent: false,
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item: AcademicYear) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      startYear: item.startYear,
      endYear: item.endYear,
      isCurrent: item.isCurrent,
      isActive: item.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Year name is required (e.g. 2025-2026)";
    if (!formData.startYear || formData.startYear < 1900 || formData.startYear > 2200) {
      errors.startYear = "Valid start year between 1900 and 2200 is required";
    }
    if (!formData.endYear || formData.endYear < 1900 || formData.endYear > 2200) {
      errors.endYear = "Valid end year between 1900 and 2200 is required";
    }
    if (formData.startYear >= formData.endYear) {
      errors.endYear = "End year must be strictly greater than start year";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      if (editingItem) {
        await academicYearsService.update(editingItem.id, formData);
        toast.success("Academic year updated successfully");
      } else {
        await academicYearsService.create(formData);
        toast.success("Academic year created successfully");
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

  // Set as current handler
  const handleSetCurrent = async () => {
    if (!currentCandidate) return;
    try {
      setCurrentLoading(true);
      await academicYearsService.setCurrent(currentCandidate.id);
      toast.success(`${currentCandidate.name} is now the active academic year`);
      setCurrentCandidate(null);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || "Failed to set current academic year";
      toast.error(msg);
    } finally {
      setCurrentLoading(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      await academicYearsService.delete(deleteTarget.id);
      toast.success("Academic year deleted successfully");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Cannot delete academic year. It may be linked to active classes or allocations.";
      setDeleteError(errorMsg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: TableColumn<AcademicYear>[] = [
    {
      header: "Academic Year",
      accessor: "name",
      className: "font-semibold text-slate-900",
      cell: (item) => (
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-900">{item.name}</span>
          {item.isCurrent && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Star className="w-3 h-3 mr-1 fill-indigo-600 text-indigo-600" />
              CURRENT
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Duration",
      accessor: "startYear",
      cell: (item) => (
        <span className="text-slate-600 text-xs font-mono">
          {item.startYear} &rarr; {item.endYear}
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
          {!item.isCurrent && (
            <button
              onClick={() => setCurrentCandidate(item)}
              title="Set as Current Academic Year"
              className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors"
            >
              Set Current
            </button>
          )}
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
        title="Academic Years"
        description="Define and manage university academic years. Set the active year for timetable scheduling."
        breadcrumbs={[{ label: "Calendar & Timing" }, { label: "Academic Years" }]}
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
              Add Academic Year
            </button>
          </div>
        }
      />

      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Search academic year..."
        searchableKey="name"
        isLoading={loading}
        emptyTitle="No Academic Years Found"
        emptyDescription="Configure your first academic calendar year to start building timetables."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingItem ? "Edit Academic Year" : "Add Academic Year"}
        description="Configure academic cycle parameters."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Year Name" required error={formErrors.name} hint="e.g. 2025-2026">
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="2025-2026"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Start Year" required error={formErrors.startYear}>
              <Input
                type="number"
                value={formData.startYear}
                onChange={(e) => {
                  const s = parseInt(e.target.value) || 0;
                  setFormData((prev) => ({
                    ...prev,
                    startYear: s,
                    endYear: prev.endYear <= s ? s + 1 : prev.endYear,
                    name: prev.name.includes("-") ? `${s}-${s + 1}` : prev.name,
                  }));
                }}
                min={1900}
                max={2200}
              />
            </FormField>

            <FormField label="End Year" required error={formErrors.endYear}>
              <Input
                type="number"
                value={formData.endYear}
                onChange={(e) => {
                  const ed = parseInt(e.target.value) || 0;
                  setFormData((prev) => ({
                    ...prev,
                    endYear: ed,
                    name: prev.name.includes("-") ? `${prev.startYear}-${ed}` : prev.name,
                  }));
                }}
                min={1900}
                max={2200}
              />
            </FormField>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <Toggle
              label="Set as Current Academic Year"
              description="Activating this will automatically set other academic years to inactive current status."
              checked={formData.isCurrent || false}
              onChange={(val) => setFormData({ ...formData, isCurrent: val })}
            />
            <Toggle
              label="Active Status"
              description="Inactive academic years are hidden from allocation drop-downs."
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
              {submitting ? "Saving..." : editingItem ? "Update Year" : "Create Year"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Set Current Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!currentCandidate}
        title="Switch Current Academic Year"
        message={`Are you sure you want to set "${currentCandidate?.name}" as the active academic year? Timetable generation and allocations will default to this year.`}
        confirmText="Yes, Set Current"
        onConfirm={handleSetCurrent}
        onCancel={() => setCurrentCandidate(null)}
        isLoading={currentLoading}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Academic Year"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete Year"
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
