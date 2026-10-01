"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Edit2, Trash2, Clock, Coffee, Utensils, BookOpen, RefreshCw, Filter } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { FormField, Input, Select, Toggle } from "@/components/FormFields";
import { useToast } from "@/components/Toast";
import { timeSlotsService } from "@/services/timeSlots";
import { TimeSlot, TimeSlotFormData, TableColumn } from "@/types";

export default function TimeSlotsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TimeSlot[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TimeSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<TimeSlotFormData>({
    name: "Period 1",
    startTime: "09:00",
    endTime: "09:50",
    slotOrder: 1,
    slotType: "PERIOD",
    isTeachingSlot: true,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete dialog states
  const [deleteTarget, setDeleteTarget] = useState<TimeSlot | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await timeSlotsService.getAll();
      const sorted = (res || []).sort((a, b) => a.slotOrder - b.slotOrder);
      setData(sorted);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load time slots");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    if (typeFilter === "ALL") return data;
    return data.filter((s) => s.slotType === typeFilter);
  }, [data, typeFilter]);

  const handleOpenCreate = () => {
    const nextOrder = data.length > 0 ? Math.max(...data.map((s) => s.slotOrder)) + 1 : 1;
    setEditingItem(null);
    setFormData({
      name: `Period ${nextOrder}`,
      startTime: "09:00",
      endTime: "09:50",
      slotOrder: nextOrder,
      slotType: "PERIOD",
      isTeachingSlot: true,
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: TimeSlot) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      startTime: item.startTime,
      endTime: item.endTime,
      slotOrder: item.slotOrder,
      slotType: item.slotType,
      isTeachingSlot: item.isTeachingSlot,
      isActive: item.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!formData.name.trim()) errors.name = "Slot name is required";
    if (!formData.startTime || !timeRegex.test(formData.startTime)) {
      errors.startTime = "Start time must be in HH:MM format (24-hour)";
    }
    if (!formData.endTime || !timeRegex.test(formData.endTime)) {
      errors.endTime = "End time must be in HH:MM format (24-hour)";
    }
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      errors.endTime = "End time must be strictly after start time";
    }
    if (!formData.slotOrder || formData.slotOrder < 1) {
      errors.slotOrder = "Slot order must be positive";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const isTeaching = formData.slotType === "PERIOD";
      const payload: TimeSlotFormData = {
        name: formData.name.trim(),
        startTime: formData.startTime.trim(),
        endTime: formData.endTime.trim(),
        slotOrder: Number(formData.slotOrder),
        slotType: formData.slotType,
        isTeachingSlot: isTeaching ? formData.isTeachingSlot ?? true : false,
        isActive: formData.isActive,
      };

      if (editingItem) {
        await timeSlotsService.update(editingItem.id, payload);
        toast.success("Time slot updated successfully");
      } else {
        await timeSlotsService.create(payload);
        toast.success("Time slot created successfully");
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
      await timeSlotsService.delete(deleteTarget.id);
      toast.success("Time slot deleted successfully");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Cannot delete time slot. It is in use by timetable schedules.";
      setDeleteError(errorMsg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: TableColumn<TimeSlot>[] = [
    {
      header: "Order",
      accessor: "slotOrder",
      className: "w-20 text-center",
      cell: (item) => (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold border border-slate-200">
          #{item.slotOrder}
        </span>
      ),
    },
    {
      header: "Slot Name",
      accessor: "name",
      className: "font-semibold text-slate-900",
      cell: (item) => (
        <div className="flex items-center space-x-2">
          {item.slotType === "BREAK" && <Coffee className="w-4 h-4 text-amber-500" />}
          {item.slotType === "LUNCH" && <Utensils className="w-4 h-4 text-purple-500" />}
          {item.slotType === "PERIOD" && <BookOpen className="w-4 h-4 text-indigo-500" />}
          <span className="font-semibold text-slate-900">{item.name}</span>
        </div>
      ),
    },
    {
      header: "Timing (24-Hour)",
      accessor: "startTime",
      cell: (item) => (
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{item.startTime}</span>
          <span className="text-slate-400">&rarr;</span>
          <span>{item.endTime}</span>
        </div>
      ),
    },
    {
      header: "Slot Type",
      accessor: "slotType",
      cell: (item) => <StatusBadge type={item.slotType} />,
    },
    {
      header: "Teaching",
      accessor: "isTeachingSlot",
      cell: (item) => (
        item.isTeachingSlot ? (
          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Yes (Lectures / Labs)
          </span>
        ) : (
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            Recess / Lunch
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
        title="Time Slots"
        description="Define daily schedule periods, tea breaks, and lunch intervals for class timetable generation."
        breadcrumbs={[{ label: "Calendar & Timing" }, { label: "Time Slots" }]}
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
              Add Time Slot
            </button>
          </div>
        }
      />

      {/* Type Filter Pills */}
      <div className="flex items-center space-x-2 p-1 bg-white rounded-xl border border-slate-200 w-fit">
        <button
          onClick={() => setTypeFilter("ALL")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            typeFilter === "ALL" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          All Slots ({data.length})
        </button>
        <button
          onClick={() => setTypeFilter("PERIOD")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            typeFilter === "PERIOD" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Teaching Periods ({data.filter((s) => s.slotType === "PERIOD").length})
        </button>
        <button
          onClick={() => setTypeFilter("BREAK")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            typeFilter === "BREAK" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Breaks ({data.filter((s) => s.slotType === "BREAK").length})
        </button>
        <button
          onClick={() => setTypeFilter("LUNCH")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            typeFilter === "LUNCH" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Lunch ({data.filter((s) => s.slotType === "LUNCH").length})
        </button>
      </div>

      <DataTable
        data={filteredData}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Search time slots..."
        searchableKey="name"
        isLoading={loading}
        emptyTitle="No Time Slots Found"
        emptyDescription="Set up daily class periods, tea breaks, and lunch hours to structure your department's timetable."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingItem ? "Edit Time Slot" : "Add Time Slot"}
        description="Configure period timings and whether teaching can take place."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <FormField label="Slot Name" required error={formErrors.name}>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Period 1, Morning Break"
                />
              </FormField>
            </div>
            <div className="sm:col-span-1">
              <FormField label="Slot Type" required>
                <Select
                  value={formData.slotType}
                  onChange={(e) => {
                    const st = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      slotType: st,
                      isTeachingSlot: st === "PERIOD",
                      name:
                        st === "BREAK" && prev.name.startsWith("Period")
                          ? "Tea Break"
                          : st === "LUNCH" && prev.name.startsWith("Period")
                          ? "Lunch Break"
                          : prev.name,
                    }));
                  }}
                >
                  <option value="PERIOD">PERIOD</option>
                  <option value="BREAK">BREAK</option>
                  <option value="LUNCH">LUNCH</option>
                </Select>
              </FormField>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Start Time (24h)" required error={formErrors.startTime}>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </FormField>

            <FormField label="End Time (24h)" required error={formErrors.endTime}>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </FormField>

            <FormField label="Slot Order #" required error={formErrors.slotOrder}>
              <Input
                type="number"
                value={formData.slotOrder}
                onChange={(e) => setFormData({ ...formData, slotOrder: parseInt(e.target.value) || 1 })}
                min={1}
                max={20}
              />
            </FormField>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <Toggle
              label="Teaching Slot"
              description="Whether classes or labs can be scheduled during this slot (uncheck for lunch and breaks)."
              checked={formData.isTeachingSlot ?? true}
              disabled={formData.slotType !== "PERIOD"}
              onChange={(val) => setFormData({ ...formData, isTeachingSlot: val })}
            />
            <Toggle
              label="Active Status"
              description="Inactive slots are excluded from timetable grids."
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
              {submitting ? "Saving..." : editingItem ? "Update Slot" : "Create Slot"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Time Slot"
        message={`Are you sure you want to delete "${deleteTarget?.name}" (${deleteTarget?.startTime} - ${deleteTarget?.endTime})?`}
        confirmText="Delete Slot"
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
