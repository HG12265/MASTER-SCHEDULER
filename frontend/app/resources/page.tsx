"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Edit2, Trash2, Building2, Users, MapPin, Filter, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { FormField, Input, Select, Textarea, Toggle } from "@/components/FormFields";
import { useToast } from "@/components/Toast";
import { resourcesService } from "@/services/resources";
import { ResourceItem, ResourceFormData, TableColumn, PaginationMeta } from "@/types";

export default function ResourcesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ResourceItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResourceItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ResourceFormData>({
    code: "",
    name: "",
    resourceType: "CLASSROOM",
    capacity: 60,
    location: "",
    description: "",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete dialog states
  const [deleteTarget, setDeleteTarget] = useState<ResourceItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await resourcesService.getAll({
        page,
        limit: 10,
        search: search.trim() || undefined,
        resourceType: typeFilter !== "ALL" ? typeFilter : undefined,
      });
      setData(res.data || []);
      setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load rooms and laboratories");
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      code: "",
      name: "",
      resourceType: "CLASSROOM",
      capacity: 60,
      location: "",
      description: "",
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ResourceItem) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      resourceType: item.resourceType,
      capacity: item.capacity,
      location: item.location || "",
      description: item.description || "",
      isActive: item.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = "Resource code is required (e.g. CR-101, LAB-CS1)";
    if (!formData.name.trim()) errors.name = "Room or lab name is required";
    if (formData.capacity < 0) errors.capacity = "Capacity cannot be negative";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload: ResourceFormData = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        resourceType: formData.resourceType,
        capacity: Number(formData.capacity) || 0,
        location: formData.location?.trim() || undefined,
        description: formData.description?.trim() || undefined,
        isActive: formData.isActive,
      };

      if (editingItem) {
        await resourcesService.update(editingItem.id, payload);
        toast.success("Resource updated successfully");
      } else {
        await resourcesService.create(payload);
        toast.success("Room or lab registered successfully");
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
      await resourcesService.delete(deleteTarget.id);
      toast.success("Resource deleted successfully");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Cannot delete resource. It is preferred or scheduled in active timetables.";
      setDeleteError(errorMsg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: TableColumn<ResourceItem>[] = [
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
      header: "Room / Facility Name",
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
      header: "Type",
      accessor: "resourceType",
      cell: (item) => <StatusBadge type={item.resourceType} />,
    },
    {
      header: "Capacity",
      accessor: "capacity",
      cell: (item) => (
        <span className="inline-flex items-center text-xs text-slate-700 font-medium">
          <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
          {item.capacity} seats / desks
        </span>
      ),
    },
    {
      header: "Location",
      accessor: "location",
      cell: (item) => (
        <span className="inline-flex items-center text-xs text-slate-500">
          {item.location ? (
            <>
              <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
              <span className="truncate max-w-xs">{item.location}</span>
            </>
          ) : (
            "—"
          )}
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
        title="Rooms & Laboratories"
        description="Manage lecture classrooms, computer laboratories, and seminar halls with workstation capacity constraints."
        breadcrumbs={[{ label: "Faculty & Resources" }, { label: "Rooms & Labs" }]}
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
              Add Room / Lab
            </button>
          </div>
        }
      />

      {/* Filter toolbar */}
      <div className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-700">Filter by Type:</span>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">All Facilities</option>
          <option value="CLASSROOM">Classroom / Lecture Hall</option>
          <option value="LAB">Laboratory</option>
          <option value="SEMINAR_HALL">Seminar Hall</option>
          <option value="WORKSHOP">Workshop</option>
        </select>
      </div>

      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Search by code, facility name, location..."
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        isLoading={loading}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        emptyTitle="No Rooms or Laboratories Found"
        emptyDescription="Register classrooms and lab facilities to support conflict-free room scheduling."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingItem ? "Edit Facility" : "Register Facility"}
        description="Configure room capacity and location for timetable scheduling."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <FormField label="Facility Code" required error={formErrors.code} hint="e.g. CR-101, LAB-1">
                <Input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="CR-101"
                />
              </FormField>
            </div>

            <div className="sm:col-span-2">
              <FormField label="Facility Name" required error={formErrors.name}>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Lecture Hall 101 / Computer Lab 1"
                />
              </FormField>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Resource Type" required>
              <Select
                value={formData.resourceType}
                onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
              >
                <option value="CLASSROOM">CLASSROOM (Lecture Hall)</option>
                <option value="LAB">LAB (Practical Laboratory)</option>
                <option value="SEMINAR_HALL">SEMINAR_HALL (Auditorium)</option>
                <option value="WORKSHOP">WORKSHOP</option>
              </Select>
            </FormField>

            <FormField label="Seating / Workstation Capacity" error={formErrors.capacity} hint="Student capacity">
              <Input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </FormField>
          </div>

          <FormField label="Physical Location / Building" hint="e.g. Science Block, 2nd Floor, Room 204">
            <Input
              type="text"
              value={formData.location || ""}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Block A, 2nd Floor"
            />
          </FormField>

          <FormField label="Notes / Equipment Available" hint="e.g. Projector, 60 GPU PCs, Whiteboard">
            <Textarea
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Installed software, hardware setup..."
            />
          </FormField>

          <div className="pt-2 border-t border-slate-100">
            <Toggle
              label="Active Status"
              description="Inactive facilities are excluded from timetable allocation."
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
              {submitting ? "Saving..." : editingItem ? "Update Facility" : "Register Facility"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Facility"
        message={`Are you sure you want to delete "${deleteTarget?.name}" (${deleteTarget?.code})?`}
        confirmText="Delete Facility"
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
