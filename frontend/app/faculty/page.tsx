"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Users, Mail, Phone, Clock, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { FormField, Input, Select, Toggle } from "@/components/FormFields";
import { useToast } from "@/components/Toast";
import { facultyService } from "@/services/faculty";
import { Faculty, FacultyFormData, TableColumn, PaginationMeta } from "@/types";

export default function FacultyPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Faculty[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Faculty | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FacultyFormData>({
    facultyCode: "",
    name: "",
    designation: "Assistant Professor",
    email: "",
    phone: "",
    maxHoursPerWeek: 16,
    maxHoursPerDay: 4,
    maxConsecutiveHours: 2,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete dialog states
  const [deleteTarget, setDeleteTarget] = useState<Faculty | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await facultyService.getAll({
        page,
        limit: 10,
        search: search.trim() || undefined,
      });
      setData(res.data || []);
      setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load faculty members");
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
      facultyCode: "",
      name: "",
      designation: "Assistant Professor",
      email: "",
      phone: "",
      maxHoursPerWeek: 16,
      maxHoursPerDay: 4,
      maxConsecutiveHours: 2,
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Faculty) => {
    setEditingItem(item);
    setFormData({
      facultyCode: item.facultyCode,
      name: item.name,
      designation: item.designation || "Assistant Professor",
      email: item.email || "",
      phone: item.phone || "",
      maxHoursPerWeek: item.maxHoursPerWeek,
      maxHoursPerDay: item.maxHoursPerDay,
      maxConsecutiveHours: item.maxConsecutiveHours,
      isActive: item.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.facultyCode.trim()) errors.facultyCode = "Faculty code is required (e.g. FAC001)";
    if (!formData.name.trim()) errors.name = "Full name is required";
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
    if (formData.maxHoursPerWeek <= 0) errors.maxHoursPerWeek = "Max weekly hours must be > 0";
    if (formData.maxHoursPerDay <= 0) errors.maxHoursPerDay = "Max daily hours must be > 0";
    if (formData.maxConsecutiveHours <= 0) errors.maxConsecutiveHours = "Max consecutive hours must be > 0";
    if (formData.maxConsecutiveHours > formData.maxHoursPerDay) {
      errors.maxConsecutiveHours = "Consecutive hours cannot exceed max daily hours";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload: FacultyFormData = {
        facultyCode: formData.facultyCode.trim().toUpperCase(),
        name: formData.name.trim(),
        designation: formData.designation?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        maxHoursPerWeek: Number(formData.maxHoursPerWeek),
        maxHoursPerDay: Number(formData.maxHoursPerDay),
        maxConsecutiveHours: Number(formData.maxConsecutiveHours),
        isActive: formData.isActive,
      };

      if (editingItem) {
        await facultyService.update(editingItem.id, payload);
        toast.success("Faculty profile updated successfully");
      } else {
        await facultyService.create(payload);
        toast.success("Faculty member registered successfully");
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
      await facultyService.delete(deleteTarget.id);
      toast.success("Faculty profile deleted successfully");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Cannot delete faculty member. They have active course allocations or timetable slots.";
      setDeleteError(errorMsg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: TableColumn<Faculty>[] = [
    {
      header: "Code",
      accessor: "facultyCode",
      className: "w-28",
      cell: (item) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
          {item.facultyCode}
        </span>
      ),
    },
    {
      header: "Faculty Member",
      accessor: "name",
      className: "font-semibold text-slate-900",
      cell: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.name}</span>
          <span className="text-[11px] text-slate-400 block font-normal">
            {item.designation || "Faculty"}
          </span>
        </div>
      ),
    },
    {
      header: "Contact",
      accessor: "email",
      cell: (item) => (
        <div className="space-y-0.5 text-xs text-slate-600">
          {item.email && (
            <div className="flex items-center space-x-1.5 truncate max-w-xs">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{item.email}</span>
            </div>
          )}
          {item.phone && (
            <div className="flex items-center space-x-1.5 text-slate-500 font-mono text-[11px]">
              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{item.phone}</span>
            </div>
          )}
          {!item.email && !item.phone && <span className="text-slate-400">—</span>}
        </div>
      ),
    },
    {
      header: "Workload Limits",
      accessor: "maxHoursPerWeek",
      cell: (item) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800">
            {item.maxHoursPerWeek} hrs/week
          </div>
          <div className="text-[11px] text-slate-400 font-normal">
            Max {item.maxHoursPerDay}/day • {item.maxConsecutiveHours} consec
          </div>
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
        title="Faculty Members"
        description="Register teaching staff and set maximum weekly, daily, and consecutive teaching hour constraints."
        breadcrumbs={[{ label: "Faculty & Resources" }, { label: "Faculty" }]}
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
              Add Faculty
            </button>
          </div>
        }
      />

      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Search by name, code, email..."
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        isLoading={loading}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        emptyTitle="No Faculty Members Registered"
        emptyDescription="Add professors, assistant professors, and lab instructors to start course allocations."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingItem ? "Edit Faculty Profile" : "Register Faculty"}
        description="Configure academic designation and workload limits for conflict-free scheduling."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <FormField label="Faculty Code" required error={formErrors.facultyCode} hint="e.g. FAC001">
                <Input
                  type="text"
                  value={formData.facultyCode}
                  onChange={(e) => setFormData({ ...formData, facultyCode: e.target.value.toUpperCase() })}
                  placeholder="FAC001"
                />
              </FormField>
            </div>

            <div className="sm:col-span-2">
              <FormField label="Full Name" required error={formErrors.name} hint="Include title (Dr./Prof.)">
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Dr. Alan Turing"
                />
              </FormField>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Designation">
              <Select
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              >
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Guest Lecturer">Guest Lecturer</option>
                <option value="Lab Instructor">Lab Instructor</option>
                <option value="Teaching Assistant">Teaching Assistant</option>
              </Select>
            </FormField>

            <FormField label="Official Email" error={formErrors.email}>
              <Input
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="alan@university.edu"
              />
            </FormField>

            <FormField label="Phone Number">
              <Input
                type="text"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
              />
            </FormField>
          </div>

          {/* Workload Limits Section */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>OR-Tools Scheduling Workload Constraints</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                label="Max Hours / Week"
                required
                error={formErrors.maxHoursPerWeek}
                hint="Total allowed teaching load"
              >
                <Input
                  type="number"
                  value={formData.maxHoursPerWeek}
                  onChange={(e) => setFormData({ ...formData, maxHoursPerWeek: parseInt(e.target.value) || 0 })}
                  min={1}
                  max={40}
                />
              </FormField>

              <FormField
                label="Max Hours / Day"
                required
                error={formErrors.maxHoursPerDay}
                hint="Daily fatigue cap"
              >
                <Input
                  type="number"
                  value={formData.maxHoursPerDay}
                  onChange={(e) => setFormData({ ...formData, maxHoursPerDay: parseInt(e.target.value) || 0 })}
                  min={1}
                  max={8}
                />
              </FormField>

              <FormField
                label="Max Consecutive Hours"
                required
                error={formErrors.maxConsecutiveHours}
                hint="Periods before break"
              >
                <Input
                  type="number"
                  value={formData.maxConsecutiveHours}
                  onChange={(e) => setFormData({ ...formData, maxConsecutiveHours: parseInt(e.target.value) || 0 })}
                  min={1}
                  max={4}
                />
              </FormField>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <Toggle
              label="Active Faculty Status"
              description="Inactive faculty members are unavailable for timetable allocation."
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
              {submitting ? "Saving..." : editingItem ? "Update Faculty" : "Register Faculty"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Faculty Member"
        message={`Are you sure you want to delete ${deleteTarget?.name} (${deleteTarget?.facultyCode})?`}
        confirmText="Delete Faculty"
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
