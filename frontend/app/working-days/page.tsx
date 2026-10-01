"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, CalendarCheck, Check, Ban, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { FormField, Input, Toggle, Select } from "@/components/FormFields";
import { useToast } from "@/components/Toast";
import { workingDaysService } from "@/services/workingDays";
import { WorkingDay, WorkingDayFormData, TableColumn } from "@/types";

const DAY_PRESETS = [
  { name: "Monday", shortName: "MON", order: 1, isWorking: true },
  { name: "Tuesday", shortName: "TUE", order: 2, isWorking: true },
  { name: "Wednesday", shortName: "WED", order: 3, isWorking: true },
  { name: "Thursday", shortName: "THU", order: 4, isWorking: true },
  { name: "Friday", shortName: "FRI", order: 5, isWorking: true },
  { name: "Saturday", shortName: "SAT", order: 6, isWorking: false },
  { name: "Sunday", shortName: "SUN", order: 7, isWorking: false },
];

export default function WorkingDaysPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WorkingDay[]>([]);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkingDay | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<WorkingDayFormData>({
    name: "Monday",
    shortName: "MON",
    dayOrder: 1,
    isWorkingDay: true,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete dialog states
  const [deleteTarget, setDeleteTarget] = useState<WorkingDay | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await workingDaysService.getAll();
      // Sort in ascending order of dayOrder
      const sorted = (res || []).sort((a, b) => a.dayOrder - b.dayOrder);
      setData(sorted);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load working days");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreate = () => {
    // Find next dayOrder not yet configured
    const existingOrders = new Set(data.map((d) => d.dayOrder));
    const nextPreset = DAY_PRESETS.find((p) => !existingOrders.has(p.order)) || DAY_PRESETS[0];

    setEditingItem(null);
    setFormData({
      name: nextPreset.name,
      shortName: nextPreset.shortName,
      dayOrder: nextPreset.order,
      isWorkingDay: nextPreset.isWorking,
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: WorkingDay) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      shortName: item.shortName,
      dayOrder: item.dayOrder,
      isWorkingDay: item.isWorkingDay,
      isActive: item.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Day name is required (e.g. Monday)";
    if (!formData.shortName.trim()) errors.shortName = "Short code is required (e.g. MON)";
    if (!formData.dayOrder || formData.dayOrder < 1 || formData.dayOrder > 14) {
      errors.dayOrder = "Day order must be between 1 and 14";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload: WorkingDayFormData = {
        name: formData.name.trim(),
        shortName: formData.shortName.trim().toUpperCase(),
        dayOrder: Number(formData.dayOrder),
        isWorkingDay: formData.isWorkingDay,
        isActive: formData.isActive,
      };

      if (editingItem) {
        await workingDaysService.update(editingItem.id, payload);
        toast.success("Working day updated successfully");
      } else {
        await workingDaysService.create(payload);
        toast.success("Working day created successfully");
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
      await workingDaysService.delete(deleteTarget.id);
      toast.success("Working day deleted successfully");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Cannot delete working day. It may be referenced by existing timetables.";
      setDeleteError(errorMsg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: TableColumn<WorkingDay>[] = [
    {
      header: "Day Order",
      accessor: "dayOrder",
      className: "w-24 text-center",
      cell: (item) => (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold border border-slate-200">
          #{item.dayOrder}
        </span>
      ),
    },
    {
      header: "Day Name",
      accessor: "name",
      className: "font-semibold text-slate-900",
      cell: (item) => (
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-900">{item.name}</span>
          <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase">
            ({item.shortName})
          </span>
        </div>
      ),
    },
    {
      header: "Teaching Scheduled",
      accessor: "isWorkingDay",
      cell: (item) => (
        item.isWorkingDay ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3 h-3 mr-1" />
            Working Day
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Ban className="w-3 h-3 mr-1 text-slate-400" />
            Non-Working / Off Day
          </span>
        )
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
        title="Working Days"
        description="Configure weekly operating schedule and select which days classes and lab sessions are held."
        breadcrumbs={[{ label: "Calendar & Timing" }, { label: "Working Days" }]}
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
              Add Working Day
            </button>
          </div>
        }
      />

      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Search days..."
        searchableKey="name"
        isLoading={loading}
        emptyTitle="No Working Days Configured"
        emptyDescription="Define academic days (e.g. Monday through Friday or Saturday) for class timetable scheduling."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingItem ? "Edit Working Day" : "Add Working Day"}
        description="Configure day details and schedule eligibility."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <FormField label="Day Name" required error={formErrors.name}>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    const n = e.target.value;
                    const matched = DAY_PRESETS.find((p) => p.name.toLowerCase() === n.toLowerCase());
                    setFormData((prev) => ({
                      ...prev,
                      name: n,
                      shortName: matched ? matched.shortName : prev.shortName,
                      dayOrder: matched ? matched.order : prev.dayOrder,
                    }));
                  }}
                  placeholder="e.g. Monday"
                />
              </FormField>
            </div>
            <div className="sm:col-span-1">
              <FormField label="Short Code" required error={formErrors.shortName}>
                <Input
                  type="text"
                  value={formData.shortName}
                  onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
                  placeholder="MON"
                  maxLength={5}
                />
              </FormField>
            </div>
          </div>

          <FormField
            label="Day Order (1 = First day of academic week)"
            required
            error={formErrors.dayOrder}
            hint="Determines the column ordering in the timetable grid"
          >
            <Input
              type="number"
              value={formData.dayOrder}
              onChange={(e) => setFormData({ ...formData, dayOrder: parseInt(e.target.value) || 1 })}
              min={1}
              max={14}
            />
          </FormField>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <Toggle
              label="Is Working Day"
              description="Enable to allow periods and lectures to be scheduled on this day."
              checked={formData.isWorkingDay ?? true}
              onChange={(val) => setFormData({ ...formData, isWorkingDay: val })}
            />
            <Toggle
              label="Active Status"
              description="Inactive days are excluded from all timetable generation runs."
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
              {submitting ? "Saving..." : editingItem ? "Update Day" : "Create Day"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Working Day"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Any timetable entries on this day will be affected.`}
        confirmText="Delete Day"
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
