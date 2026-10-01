"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Edit2, Trash2, UserCheck, Filter, Users, BookOpen, Clock, Building2, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { FormField, Input, Select, Textarea, Toggle } from "@/components/FormFields";
import { useToast } from "@/components/Toast";
import { facultyAllocationsService } from "@/services/facultyAllocations";
import { academicYearsService } from "@/services/academicYears";
import { semesterTypesService } from "@/services/semesterTypes";
import { classesService } from "@/services/classes";
import { subjectsService } from "@/services/subjects";
import { facultyService } from "@/services/faculty";
import { resourcesService } from "@/services/resources";
import {
  FacultyAllocation,
  FacultyAllocationFormData,
  AcademicYear,
  SemesterType,
  ClassEntity,
  Subject,
  Faculty,
  ResourceItem,
  TableColumn,
  PaginationMeta,
} from "@/types";

export default function FacultyAllocationsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FacultyAllocation[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);

  // Master lookup states
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesterTypes, setSemesterTypes] = useState<SemesterType[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [facultyMembers, setFacultyMembers] = useState<Faculty[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);

  // Filter toolbar
  const [filterYear, setFilterYear] = useState<string>("ALL");
  const [filterSemType, setFilterSemType] = useState<string>("ALL");
  const [filterClass, setFilterClass] = useState<string>("ALL");
  const [filterFaculty, setFilterFaculty] = useState<string>("ALL");

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FacultyAllocation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FacultyAllocationFormData>({
    academicYearId: "",
    semesterTypeId: "",
    classId: "",
    subjectId: "",
    facultyIds: [],
    weeklyHours: 4,
    blockSize: 1,
    requiresConsecutivePeriods: false,
    preferredResourceId: "",
    notes: "",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete dialog states
  const [deleteTarget, setDeleteTarget] = useState<FacultyAllocation | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load all master entities
  const loadMasters = useCallback(async () => {
    try {
      const [ay, st, cls, sub, fac, res] = await Promise.all([
        academicYearsService.getAll(),
        semesterTypesService.getAll(),
        classesService.getAll({ limit: 100 }),
        subjectsService.getAll({ limit: 100 }),
        facultyService.getAll({ limit: 100 }),
        resourcesService.getAll({ limit: 100 }),
      ]);
      setAcademicYears(ay || []);
      setSemesterTypes(st || []);
      setClasses(cls.data || []);
      setSubjects(sub.data || []);
      setFacultyMembers(fac.data || []);
      setResources(res.data || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await facultyAllocationsService.getAll({
        page,
        limit: 10,
        academicYearId: filterYear !== "ALL" ? filterYear : undefined,
        semesterTypeId: filterSemType !== "ALL" ? filterSemType : undefined,
        classId: filterClass !== "ALL" ? filterClass : undefined,
        facultyId: filterFaculty !== "ALL" ? filterFaculty : undefined,
      });
      setData(res.data || []);
      setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load faculty allocations");
    } finally {
      setLoading(false);
    }
  }, [page, filterYear, filterSemType, filterClass, filterFaculty, toast]);

  useEffect(() => {
    loadMasters();
  }, [loadMasters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lookup maps
  const ayMap = useMemo(() => new Map(academicYears.map((y) => [y.id, y])), [academicYears]);
  const stMap = useMemo(() => new Map(semesterTypes.map((t) => [t.id, t])), [semesterTypes]);
  const classMap = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const facultyMap = useMemo(() => new Map(facultyMembers.map((f) => [f.id, f])), [facultyMembers]);
  const resourceMap = useMemo(() => new Map(resources.map((r) => [r.id, r])), [resources]);

  // Classes filtered by modal's chosen Academic Year and Semester Type
  const modalEligibleClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchYear = !formData.academicYearId || c.academicYearId === formData.academicYearId;
      const matchSemType = !formData.semesterTypeId || c.semesterTypeId === formData.semesterTypeId;
      return matchYear && matchSemType;
    });
  }, [classes, formData.academicYearId, formData.semesterTypeId]);

  // Selected Class in modal
  const selectedClass = useMemo(() => {
    return classMap.get(formData.classId);
  }, [classMap, formData.classId]);

  // Subjects filtered by selected class's programme and semester!
  const modalEligibleSubjects = useMemo(() => {
    if (!selectedClass) return subjects;
    return subjects.filter(
      (s) =>
        s.programmeId === selectedClass.programmeId &&
        s.semesterId === selectedClass.semesterId
    );
  }, [subjects, selectedClass]);

  // Selected Subject in modal
  const selectedSubject = useMemo(() => {
    return subjectMap.get(formData.subjectId);
  }, [subjectMap, formData.subjectId]);

  // Preferred resources sorted/filtered by subject type (highlight LAB if lab subject)
  const sortedResources = useMemo(() => {
    const isLab = selectedSubject?.subjectType === "LAB";
    return [...resources].sort((a, b) => {
      if (isLab) {
        if (a.resourceType === "LAB" && b.resourceType !== "LAB") return -1;
        if (a.resourceType !== "LAB" && b.resourceType === "LAB") return 1;
      }
      return a.code.localeCompare(b.code);
    });
  }, [resources, selectedSubject]);

  // Calculate current allocated workload per faculty across all active allocations
  const facultyWorkloadMap = useMemo(() => {
    const counts = new Map<string, number>();
    data.forEach((alloc) => {
      alloc.facultyIds?.forEach((fid) => {
        counts.set(fid, (counts.get(fid) || 0) + (alloc.weeklyHours || 0));
      });
    });
    return counts;
  }, [data]);

  const handleOpenCreate = () => {
    const currentYear = academicYears.find((y) => y.isCurrent) || academicYears[0];
    const defaultSemType = semesterTypes[0];
    const firstClass = classes.find(
      (c) =>
        (!currentYear || c.academicYearId === currentYear.id) &&
        (!defaultSemType || c.semesterTypeId === defaultSemType.id)
    ) || classes[0];

    const initialClass = firstClass;
    const compatibleSubjects = initialClass
      ? subjects.filter(
          (s) =>
            s.programmeId === initialClass.programmeId &&
            s.semesterId === initialClass.semesterId
        )
      : subjects;
    const initialSubject = compatibleSubjects[0] || subjects[0];

    setEditingItem(null);
    setFormData({
      academicYearId: currentYear?.id || "",
      semesterTypeId: defaultSemType?.id || "",
      classId: initialClass?.id || "",
      subjectId: initialSubject?.id || "",
      facultyIds: facultyMembers[0] ? [facultyMembers[0].id] : [],
      weeklyHours: initialSubject?.defaultWeeklyHours || 4,
      blockSize: initialSubject?.defaultBlockSize || 1,
      requiresConsecutivePeriods: initialSubject?.requiresConsecutivePeriods || false,
      preferredResourceId: "",
      notes: "",
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: FacultyAllocation) => {
    setEditingItem(item);
    setFormData({
      academicYearId: item.academicYearId,
      semesterTypeId: item.semesterTypeId,
      classId: item.classId,
      subjectId: item.subjectId,
      facultyIds: item.facultyIds || [],
      weeklyHours: item.weeklyHours,
      blockSize: item.blockSize,
      requiresConsecutivePeriods: item.requiresConsecutivePeriods,
      preferredResourceId: item.preferredResourceId || "",
      notes: item.notes || "",
      isActive: item.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // When class changes, adjust subject
  const handleClassChange = (newClassId: string) => {
    const cls = classMap.get(newClassId);
    let sub = selectedSubject;
    if (cls) {
      const validSubs = subjects.filter(
        (s) => s.programmeId === cls.programmeId && s.semesterId === cls.semesterId
      );
      if (!validSubs.some((s) => s.id === formData.subjectId)) {
        sub = validSubs[0] || undefined;
      }
    }
    setFormData((prev) => ({
      ...prev,
      classId: newClassId,
      subjectId: sub ? sub.id : prev.subjectId,
      weeklyHours: sub ? sub.defaultWeeklyHours : prev.weeklyHours,
      blockSize: sub ? sub.defaultBlockSize : prev.blockSize,
      requiresConsecutivePeriods: sub ? sub.requiresConsecutivePeriods : prev.requiresConsecutivePeriods,
    }));
  };

  // When subject changes, prefill defaults
  const handleSubjectChange = (newSubId: string) => {
    const sub = subjectMap.get(newSubId);
    setFormData((prev) => ({
      ...prev,
      subjectId: newSubId,
      weeklyHours: sub ? sub.defaultWeeklyHours : prev.weeklyHours,
      blockSize: sub ? sub.defaultBlockSize : prev.blockSize,
      requiresConsecutivePeriods: sub ? sub.requiresConsecutivePeriods : prev.requiresConsecutivePeriods,
    }));
  };

  // Toggle faculty member selection
  const handleToggleFaculty = (fid: string) => {
    setFormData((prev) => {
      const exists = prev.facultyIds.includes(fid);
      const next = exists
        ? prev.facultyIds.filter((id) => id !== fid)
        : [...prev.facultyIds, fid];
      return { ...prev, facultyIds: next };
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.academicYearId) errors.academicYearId = "Academic Year is required";
    if (!formData.semesterTypeId) errors.semesterTypeId = "Semester Term is required";
    if (!formData.classId) errors.classId = "Class is required";
    if (!formData.subjectId) errors.subjectId = "Subject is required";
    if (!formData.facultyIds || formData.facultyIds.length === 0) {
      errors.facultyIds = "At least one faculty member must be assigned";
    }
    if (formData.weeklyHours <= 0 || formData.weeklyHours > 40) {
      errors.weeklyHours = "Weekly hours must be between 1 and 40";
    }
    if (formData.blockSize <= 0 || formData.blockSize > 6) {
      errors.blockSize = "Block size must be between 1 and 6";
    }
    if (formData.requiresConsecutivePeriods && formData.blockSize <= 1) {
      errors.blockSize = "Consecutive periods requires a block size of 2 or more";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload: FacultyAllocationFormData = {
        academicYearId: formData.academicYearId,
        semesterTypeId: formData.semesterTypeId,
        classId: formData.classId,
        subjectId: formData.subjectId,
        facultyIds: formData.facultyIds,
        weeklyHours: Number(formData.weeklyHours),
        blockSize: Number(formData.blockSize),
        requiresConsecutivePeriods: formData.requiresConsecutivePeriods,
        preferredResourceId: formData.preferredResourceId || undefined,
        notes: formData.notes?.trim() || undefined,
        isActive: formData.isActive,
      };

      if (editingItem) {
        await facultyAllocationsService.update(editingItem.id, payload);
        toast.success("Course allocation updated successfully");
      } else {
        await facultyAllocationsService.create(payload);
        toast.success("Faculty course allocation created successfully");
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
      await facultyAllocationsService.delete(deleteTarget.id);
      toast.success("Allocation removed successfully");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Cannot delete allocation. Timetable slots may be linked.";
      setDeleteError(errorMsg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: TableColumn<FacultyAllocation>[] = [
    {
      header: "Class Cohort",
      accessor: "classId",
      cell: (item) => {
        const cls = classMap.get(item.classId);
        return (
          <div>
            <span className="font-semibold text-slate-900">{cls?.name || item.className || "Class"}</span>
            <span className="text-[11px] text-slate-400 block font-normal">
              {cls?.displayName || ""}
            </span>
          </div>
        );
      },
    },
    {
      header: "Course / Subject",
      accessor: "subjectId",
      cell: (item) => {
        const sub = subjectMap.get(item.subjectId);
        return (
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-xs text-slate-900">{sub?.name || item.subjectName || "Subject"}</span>
              <StatusBadge type={sub?.subjectType || item.subjectCode} />
            </div>
            <span className="text-[11px] font-mono text-slate-400 block">
              {sub?.subjectCode || item.subjectCode || "—"}
            </span>
          </div>
        );
      },
    },
    {
      header: "Assigned Faculty",
      accessor: "facultyIds",
      cell: (item) => {
        const assigned = item.facultyIds?.map((id) => facultyMap.get(id)).filter(Boolean) as Faculty[];
        return (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {assigned && assigned.length > 0 ? (
              assigned.map((f) => (
                <span
                  key={f.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200"
                >
                  <Users className="w-3 h-3 mr-1 text-slate-400" />
                  {f.name}
                </span>
              ))
            ) : item.facultyNames && item.facultyNames.length > 0 ? (
              item.facultyNames.map((name, i) => (
                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700">
                  {name}
                </span>
              ))
            ) : (
              <span className="text-slate-400 text-xs italic">Unassigned</span>
            )}
          </div>
        );
      },
    },
    {
      header: "Load & Block",
      accessor: "weeklyHours",
      cell: (item) => (
        <div className="text-xs text-slate-700">
          <span className="font-semibold">{item.weeklyHours} hrs/wk</span>
          <span className="text-slate-400 block text-[11px] font-normal">
            {item.blockSize} per session {item.requiresConsecutivePeriods ? "(Consec)" : ""}
          </span>
        </div>
      ),
    },
    {
      header: "Facility",
      accessor: "preferredResourceId",
      cell: (item) => {
        const res = item.preferredResourceId ? resourceMap.get(item.preferredResourceId) : null;
        return res ? (
          <span className="inline-flex items-center text-xs text-slate-700">
            <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
            {res.code} ({res.name})
          </span>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        );
      },
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
        title="Faculty Subject Allocation"
        description="Allocate faculty to classes and courses, configure multi-faculty lab sessions, and preview workload limits."
        breadcrumbs={[{ label: "Faculty & Resources" }, { label: "Subject Allocation" }]}
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
              disabled={classes.length === 0 || subjects.length === 0 || facultyMembers.length === 0}
              className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Allocation
            </button>
          </div>
        }
      />

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Filter Allocations:</span>
        </div>

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

        <select
          value={filterSemType}
          onChange={(e) => {
            setFilterSemType(e.target.value);
            setPage(1);
          }}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">All Semester Terms</option>
          {semesterTypes.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name} ({st.code})
            </option>
          ))}
        </select>

        <select
          value={filterClass}
          onChange={(e) => {
            setFilterClass(e.target.value);
            setPage(1);
          }}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={filterFaculty}
          onChange={(e) => {
            setFilterFaculty(e.target.value);
            setPage(1);
          }}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">All Faculty</option>
          {facultyMembers.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.facultyCode})
            </option>
          ))}
        </select>
      </div>

      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        emptyTitle="No Faculty Allocations Configured"
        emptyDescription="Create course allocations linking faculty members to specific student cohorts and subjects."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingItem ? "Edit Course Allocation" : "Allocate Faculty to Course"}
        description="Connect classes, curriculum subjects, teaching staff, and preferred facilities."
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Target Class Cohort" required error={formErrors.classId}>
              <Select
                value={formData.classId}
                onChange={(e) => handleClassChange(e.target.value)}
              >
                <option value="">Select Class...</option>
                {modalEligibleClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.displayName})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Curriculum Subject" required error={formErrors.subjectId}>
              <Select
                value={formData.subjectId}
                disabled={!formData.classId}
                onChange={(e) => handleSubjectChange(e.target.value)}
              >
                <option value="">Select Subject...</option>
                {modalEligibleSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subjectCode} — {s.name} ({s.subjectType}, {s.defaultWeeklyHours} hrs)
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {/* Multi-Select Faculty with Workload Preview */}
          <div className="space-y-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800">
                Assigned Faculty Members <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Multiple selection supported for lab courses
              </span>
            </div>

            {formErrors.facultyIds && (
              <p className="text-[11px] font-medium text-rose-600">{formErrors.facultyIds}</p>
            )}

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {facultyMembers.map((f) => {
                const isSelected = formData.facultyIds.includes(f.id);
                const currentLoad = facultyWorkloadMap.get(f.id) || 0;
                const newLoad = isSelected ? currentLoad : currentLoad + formData.weeklyHours;
                const isOverload = newLoad > f.maxHoursPerWeek;

                return (
                  <div
                    key={f.id}
                    onClick={() => handleToggleFaculty(f.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-indigo-50 border-indigo-300 text-indigo-950 font-medium"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent div
                        className="rounded text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                      />
                      <div>
                        <div className="font-semibold text-slate-900">{f.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {f.facultyCode} • {f.designation || "Faculty"}
                        </div>
                      </div>
                    </div>

                    {/* Workload Indicator */}
                    <div className="flex items-center space-x-2 text-[11px]">
                      <span className="font-mono text-slate-600">
                        {currentLoad} / {f.maxHoursPerWeek} hrs
                      </span>
                      {isOverload ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                          <AlertCircle className="w-3 h-3 mr-0.5" />
                          Overload Risk
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-emerald-600 text-[10px]">
                          <CheckCircle className="w-3 h-3 mr-0.5" />
                          OK
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Weekly Hours (Periods)" required error={formErrors.weeklyHours}>
              <Input
                type="number"
                value={formData.weeklyHours}
                onChange={(e) => setFormData({ ...formData, weeklyHours: parseInt(e.target.value) || 1 })}
                min={1}
                max={40}
              />
            </FormField>

            <FormField label="Block Size (Periods / Session)" required error={formErrors.blockSize}>
              <Input
                type="number"
                value={formData.blockSize}
                onChange={(e) => setFormData({ ...formData, blockSize: parseInt(e.target.value) || 1 })}
                min={1}
                max={6}
              />
            </FormField>

            <FormField label="Preferred Room / Lab" hint="Optional venue assignment">
              <Select
                value={formData.preferredResourceId || ""}
                onChange={(e) => setFormData({ ...formData, preferredResourceId: e.target.value })}
              >
                <option value="">Auto-Assign (Engine Decides)</option>
                {sortedResources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} — {r.name} ({r.resourceType}, {r.capacity} seats)
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <Toggle
              label="Requires Consecutive Periods"
              description="Keep daily sessions back-to-back without intervening periods or breaks."
              checked={formData.requiresConsecutivePeriods || false}
              onChange={(val) => setFormData({ ...formData, requiresConsecutivePeriods: val })}
            />
          </div>

          <FormField label="Allocation Notes" hint="Optional scheduling notes for timetable solver">
            <Textarea
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Needs projector, or batch 1 only..."
            />
          </FormField>

          <div className="pt-2 border-t border-slate-100">
            <Toggle
              label="Active Allocation"
              description="Inactive allocations will be skipped by the OR-Tools timetable generator."
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
              {submitting ? "Saving..." : editingItem ? "Update Allocation" : "Create Allocation"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Course Allocation"
        message="Are you sure you want to remove this faculty course allocation? Any generated timetable periods will be unassigned."
        confirmText="Delete Allocation"
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
