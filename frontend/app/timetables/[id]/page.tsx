"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CalendarDays,
  Calendar,
  Clock,
  School,
  Users,
  Building2,
  Lock,
  Sparkles,
  ChevronLeft,
  Info,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  X,
  Layers,
  BarChart3,
  Award,
  Edit3,
  LogOut,
  History,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Send,
  RotateCcw,
  Archive,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { timetablesService } from "@/services/timetables";
import { timetableEditService } from "@/services/timetableEditService";
import { timetablePublicationService } from "@/services/timetablePublicationService";
import {
  Timetable,
  TimetableMasterView,
  TimetableEntry,
} from "@/types";
import { TimetableValidationReport } from "@/types/timetableEdit";

// Phase 7 Publication & Export Components
import { TimetableStatusBadge, ValidationStatusBadge } from "@/components/timetable/TimetableStatusBadge";
import { PublishConfirmDialog } from "@/components/timetable/PublishConfirmDialog";
import { ExportMenu } from "@/components/timetable/ExportMenu";

// Phase 6 Editing Components
import { EditableTimetableGrid } from "@/components/timetable/EditableTimetableGrid";
import { MoveEntryDialog } from "@/components/timetable/MoveEntryDialog";
import { SwapConfirmDialog } from "@/components/timetable/SwapConfirmDialog";
import { ManualAddEntryModal } from "@/components/timetable/ManualAddEntryModal";
import { RemoveConfirmModal } from "@/components/timetable/RemoveConfirmModal";
import { ChangeHistoryDrawer } from "@/components/timetable/ChangeHistoryDrawer";
import { PartialRegenerationModal } from "@/components/timetable/PartialRegenerationModal";
import { ValidationPanel } from "@/components/timetable/ValidationPanel";

export default function TimetableDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const timetableId = params?.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [masterView, setMasterView] = useState<TimetableMasterView | null>(null);

  // Mode: View Mode vs Edit Mode
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Active Tab: "class" | "faculty" | "master" | "analytics"
  const [activeTab, setActiveTab] = useState<"class" | "faculty" | "master" | "analytics">("class");

  // Selection states
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");

  // Modal states
  const [inspectedEntry, setInspectedEntry] = useState<TimetableEntry | null>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState<boolean>(false);
  const [regenModalOpen, setRegenModalOpen] = useState<boolean>(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState<boolean>(false);
  const [selectedEntryForMove, setSelectedEntryForMove] = useState<TimetableEntry | null>(null);
  const [swapDialogOpen, setSwapDialogOpen] = useState<boolean>(false);
  const [swapPair, setSwapPair] = useState<{ first: TimetableEntry; second: TimetableEntry } | null>(null);
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [addCellContext, setAddCellContext] = useState<{
    dayId: string;
    dayName: string;
    slotId: string;
    slotName: string;
  } | null>(null);
  const [removeModalOpen, setRemoveModalOpen] = useState<boolean>(false);
  const [selectedEntryForRemove, setSelectedEntryForRemove] = useState<TimetableEntry | null>(null);

  const loadData = useCallback(async () => {
    if (!timetableId) return;
    try {
      setLoading(true);
      const data = await timetablesService.getMasterView(timetableId);
      setMasterView(data);

      if (data.classes && data.classes.length > 0 && !selectedClassId) {
        setSelectedClassId(data.classes[0].id);
      }

      const allFacultyIds = new Set<string>();
      data.entries.forEach((e) => {
        e.facultyIds?.forEach((fid) => allFacultyIds.add(fid));
      });
      const firstFaculty = Array.from(allFacultyIds)[0];
      if (firstFaculty && !selectedFacultyId) {
        setSelectedFacultyId(firstFaculty);
      }
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Failed to load timetable", "error");
    } finally {
      setLoading(false);
    }
  }, [timetableId, toast, selectedClassId, selectedFacultyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract unique faculty list with names
  const facultyList = useMemo(() => {
    if (!masterView) return [];
    const map = new Map<string, string>();
    masterView.entries.forEach((e) => {
      e.facultyIds?.forEach((fid, idx) => {
        const fname = e.facultyNames?.[idx] || fid;
        map.set(fid, fname);
      });
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [masterView]);

  // Working days sorted
  const workingDays = useMemo(() => {
    if (!masterView?.workingDays) return [];
    return [...masterView.workingDays].sort((a, b) => a.dayOrder - b.dayOrder);
  }, [masterView]);

  // Teaching slots sorted
  const timeSlots = useMemo(() => {
    if (!masterView?.teachingSlots) return [];
    return [...masterView.teachingSlots].sort((a, b) => a.slotOrder - b.slotOrder);
  }, [masterView]);

  // Matrix map for Class View: `dayId_slotId` -> TimetableEntry
  const classMatrix = useMemo(() => {
    const map = new Map<string, TimetableEntry>();
    if (!masterView || !selectedClassId) return map;
    masterView.entries
      .filter((e) => e.classId === selectedClassId)
      .forEach((e) => {
        map.set(`${e.workingDayId}_${e.timeSlotId}`, e);
      });
    return map;
  }, [masterView, selectedClassId]);

  // Matrix map for Faculty View: `dayId_slotId` -> TimetableEntry
  const facultyMatrix = useMemo(() => {
    const map = new Map<string, TimetableEntry>();
    if (!masterView || !selectedFacultyId) return map;
    masterView.entries
      .filter((e) => e.facultyIds?.includes(selectedFacultyId))
      .forEach((e) => {
        map.set(`${e.workingDayId}_${e.timeSlotId}`, e);
      });
    return map;
  }, [masterView, selectedFacultyId]);

  if (loading && !masterView) {
    return (
      <AdminLayout>
        <div className="py-24 text-center text-slate-400 text-xs">
          Loading timetable matrix and optimization data...
        </div>
      </AdminLayout>
    );
  }

  if (!masterView) {
    return (
      <AdminLayout>
        <div className="py-24 text-center text-slate-600 text-sm">
          Timetable not found or failed to load.
        </div>
      </AdminLayout>
    );
  }

  const tt = masterView.timetable;
  const currentRevision = tt.revision || 1;
  const validationStatus = tt.validationStatus || "VALID";
  const selectedClass = masterView.classes.find((c) => c.id === selectedClassId);
  const selectedFaculty = facultyList.find((f) => f.id === selectedFacultyId);

  // Phase 7 Publication & Immutability States
  const [publishDialogOpen, setPublishDialogOpen] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isReturning, setIsReturning] = useState<boolean>(false);
  const [isArchiving, setIsArchiving] = useState<boolean>(false);
  const [isCloning, setIsCloning] = useState<boolean>(false);

  // Edit Mode toggle
  function handleToggleEditMode() {
    if (!isEditMode) {
      if (tt.status !== "DRAFT") {
        toast.showToast(
          "Published or archived timetables cannot be edited directly. Create a draft version first.",
          "error"
        );
        return;
      }
      setIsEditMode(true);
      toast.showToast("Entered Manual Edit Mode. Drag periods or click cells to edit.", "info");
    } else {
      setIsEditMode(false);
      toast.showToast("Exited Edit Mode. Timetable is in View Mode.", "info");
    }
  }

  // Publication Workflow Handlers
  const handleSubmitForApproval = async () => {
    try {
      setIsSubmitting(true);
      const res = await timetablePublicationService.submitForApproval(timetableId);
      toast.showToast(res.message || "Submitted for approval successfully", "success");
      loadData();
    } catch (err: any) {
      toast.showToast(err?.response?.data?.message || "Failed to submit for approval", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnToDraft = async () => {
    try {
      setIsReturning(true);
      const res = await timetablePublicationService.returnToDraft(timetableId);
      toast.showToast(res.message || "Returned to draft successfully", "success");
      loadData();
    } catch (err: any) {
      toast.showToast(err?.response?.data?.message || "Failed to return to draft", "error");
    } finally {
      setIsReturning(false);
    }
  };

  const handlePublishConfirm = async () => {
    try {
      setIsPublishing(true);
      const res = await timetablePublicationService.publish(timetableId);
      toast.showToast("Timetable officially published! Direct editing is now permanently disabled.", "success");
      setPublishDialogOpen(false);
      setIsEditMode(false);
      loadData();
    } catch (err: any) {
      toast.showToast(err?.response?.data?.message || "Publish validation failed", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCreateDraftCopy = async () => {
    try {
      setIsCloning(true);
      const res = await timetablePublicationService.createDraftCopy(timetableId);
      toast.showToast("Created new editable draft version!", "success");
      router.push(`/timetables/${res.data.id}`);
    } catch (err: any) {
      toast.showToast(err?.response?.data?.message || "Failed to create draft copy", "error");
    } finally {
      setIsCloning(false);
    }
  };

  const handleArchive = async () => {
    try {
      setIsArchiving(true);
      const res = await timetablePublicationService.archive(timetableId);
      toast.showToast("Timetable moved to archive.", "success");
      loadData();
    } catch (err: any) {
      toast.showToast(err?.response?.data?.message || "Failed to archive timetable", "error");
    } finally {
      setIsArchiving(false);
    }
  };

  // Lock / Unlock toggle
  async function handleToggleLock(entry: TimetableEntry) {
    try {
      if (entry.isFixed) {
        toast.showToast("System-fixed entries cannot be altered directly.", "error");
        return;
      }
      if (entry.isLocked) {
        await timetableEditService.unlockEntry(timetableId, entry.id);
        toast.showToast(`Unlocked '${entry.subjectName || entry.title}'`, "success");
      } else {
        await timetableEditService.lockEntry(timetableId, entry.id);
        toast.showToast(`Locked '${entry.subjectName || entry.title}'`, "success");
      }
      loadData();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Failed to toggle lock", "error");
    }
  }

  return (
    <AdminLayout>
      <div className="mb-4">
        <Link
          href="/timetables"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Timetable History
        </Link>
      </div>

      <PageHeader
        title={tt.name || `Timetable v${tt.version}`}
        description={`${tt.academicYearName || "Academic Year"} • ${tt.semesterTypeName || "Semester Type"} • Synthesized in ${tt.generationDurationMs} ms`}
        breadcrumbs={[
          { label: "Timetables & Views", href: "/timetables" },
          { label: `Version ${tt.version}` },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Revision Badge */}
            <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700">
              Rev #{currentRevision}
            </span>

            {/* Timetable Status Badge */}
            <TimetableStatusBadge status={tt.status} />

            {/* Validation Status Badge */}
            <ValidationStatusBadge status={validationStatus} />

            {/* Export & Print Menu */}
            <ExportMenu
              timetableId={timetableId}
              activeView={activeTab === "master" ? "master" : activeTab === "faculty" ? "faculty" : "class"}
              selectedClassId={selectedClassId}
              selectedFacultyId={selectedFacultyId}
              onPrint={() =>
                router.push(
                  `/timetables/${timetableId}/print?view=${
                    activeTab === "master" ? "master" : activeTab === "faculty" ? "faculty" : "class"
                  }&classId=${selectedClassId}&facultyId=${selectedFacultyId}`
                )
              }
            />

            {/* Status-specific Workflow Action Buttons */}
            {tt.status === "DRAFT" && (
              <>
                <button
                  type="button"
                  onClick={handleSubmitForApproval}
                  disabled={isSubmitting || validationStatus !== "VALID"}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition shadow flex items-center gap-1.5 disabled:opacity-50"
                  title={validationStatus !== "VALID" ? "Must be VALID to submit for approval" : "Submit for Approval"}
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? "Submitting..." : "Submit for Approval"}
                </button>

                <button
                  type="button"
                  onClick={handleToggleEditMode}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition shadow flex items-center gap-1.5 ${
                    isEditMode
                      ? "bg-rose-600 hover:bg-rose-500 text-white"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white"
                  }`}
                >
                  {isEditMode ? (
                    <>
                      <LogOut className="w-3.5 h-3.5" />
                      Exit Edit Mode
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Timetable
                    </>
                  )}
                </button>
              </>
            )}

            {tt.status === "READY_FOR_APPROVAL" && (
              <>
                <button
                  type="button"
                  onClick={handleReturnToDraft}
                  disabled={isReturning}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {isReturning ? "Returning..." : "Return to Draft"}
                </button>

                <button
                  type="button"
                  onClick={() => setPublishDialogOpen(true)}
                  disabled={validationStatus !== "VALID"}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow flex items-center gap-1.5 disabled:opacity-50"
                  title={validationStatus !== "VALID" ? "Must be VALID to publish" : "Publish Official Timetable"}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Publish Timetable
                </button>
              </>
            )}

            {tt.status === "PUBLISHED" && (
              <>
                <button
                  type="button"
                  onClick={handleCreateDraftCopy}
                  disabled={isCloning}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                  {isCloning ? "Creating Draft..." : "Create New Draft Version"}
                </button>

                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={isArchiving}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition shadow flex items-center gap-1.5"
                >
                  <Archive className="w-3.5 h-3.5" />
                  {isArchiving ? "Archiving..." : "Archive"}
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Edit Mode Control Toolbar */}
      {isEditMode && (
        <div className="mb-6 p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Active Edit Mode</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  Authoritative Backend Validation
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                Drag periods to move, drop on occupied cells to swap, click empty cells to assign.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Partial Regeneration Button */}
            <button
              onClick={() => setRegenModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-700 hover:bg-indigo-600 rounded-xl transition shadow flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              Regenerate Section
            </button>

            {/* Change History Button */}
            <button
              onClick={() => setHistoryDrawerOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              History & Undo
            </button>
          </div>
        </div>
      )}

      {/* Timetable Invariant Validation Panel */}
      <div className="mb-6">
        <ValidationPanel
          timetableId={timetableId}
          onValidationComplete={() => loadData()}
        />
      </div>

      {/* Official Published Immutability Banner */}
      {tt.status === "PUBLISHED" && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Official Published Timetable</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Immutable v{tt.version}
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                Published on {new Date(tt.publishedAt || tt.generatedAt).toLocaleString()} {tt.publishedBy ? `by ${tt.publishedBy}` : ""}. Direct manual editing is disabled to preserve institutional audit integrity. Future changes must be made through a new draft copy.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreateDraftCopy}
            disabled={isCloning}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition shadow flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            {isCloning ? "Cloning..." : "Create New Draft Version"}
          </button>
        </div>
      )}

      {/* Archived Banner */}
      {tt.status === "ARCHIVED" && (
        <div className="mb-6 p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center space-x-3 text-slate-400">
          <Archive className="w-5 h-5 text-slate-500 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-slate-300">Archived Historical Timetable.</span> This record is stored for historical reporting and audit purposes and is strictly read-only.
          </div>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("class")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "class"
              ? "border-indigo-500 text-indigo-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <School className="w-4 h-4" />
          Class View {isEditMode && "(Editable)"}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("faculty")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "faculty"
              ? "border-indigo-500 text-indigo-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          Faculty View
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("master")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "master"
              ? "border-indigo-500 text-indigo-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-4 h-4" />
          Department Master Grid
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "analytics"
              ? "border-indigo-500 text-indigo-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Workload & Analytics
        </button>
      </div>

      {/* TAB 1: CLASS VIEW (PRIMARY EDITING CANVAS) */}
      {activeTab === "class" && (
        <div className="space-y-6">
          {/* Class Selector Bar */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-400 whitespace-nowrap">
                Select Class:
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl border border-slate-700 bg-slate-950 font-semibold text-white focus:outline-none focus:border-indigo-500"
              >
                {masterView.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section ? `(Section ${c.section})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <span>Theory Subject</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
                <span>Laboratory Block</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>System Fixed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                <span>Manually Locked</span>
              </div>
            </div>
          </div>

          {/* Editable Timetable Grid */}
          <EditableTimetableGrid
            timetableId={timetableId}
            isEditMode={isEditMode}
            currentRevision={currentRevision}
            workingDays={workingDays}
            timeSlots={timeSlots}
            matrixMap={classMatrix}
            onRefreshData={loadData}
            onOpenDetails={(entry) => setInspectedEntry(entry)}
            onOpenMoveDialog={(entry) => {
              setSelectedEntryForMove(entry);
              setMoveDialogOpen(true);
            }}
            onOpenSwapDialog={(first, second) => {
              setSwapPair({ first, second });
              setSwapDialogOpen(true);
            }}
            onOpenAddModal={(dayId, dayName, slotId, slotName) => {
              setAddCellContext({ dayId, dayName, slotId, slotName });
              setAddModalOpen(true);
            }}
            onOpenRemoveModal={(entry) => {
              setSelectedEntryForRemove(entry);
              setRemoveModalOpen(true);
            }}
            onToggleLock={handleToggleLock}
          />
        </div>
      )}

      {/* TAB 2: FACULTY VIEW */}
      {activeTab === "faculty" && (
        <div className="space-y-6">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-400 whitespace-nowrap">
                Select Faculty:
              </label>
              <select
                value={selectedFacultyId}
                onChange={(e) => setSelectedFacultyId(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl border border-slate-700 bg-slate-950 font-semibold text-white focus:outline-none focus:border-indigo-500"
              >
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            {isEditMode && (
              <span className="text-xs text-amber-400 bg-amber-950/30 px-3 py-1.5 rounded-xl border border-amber-800/40">
                💡 Primary drag-and-drop manual editing is conducted in Class View.
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40 shadow-xl">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 text-left w-28 sticky left-0 bg-slate-900 z-10">Day / Period</th>
                  {timeSlots.map((slot) => (
                    <th key={slot.id} className="py-3 px-3 text-center border-l border-slate-800/80 min-w-[140px]">
                      <div>{slot.name}</div>
                      <div className="text-[10px] font-normal text-slate-500 lowercase">
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {workingDays.map((day) => (
                  <tr key={day.id} className="hover:bg-slate-900/20 transition">
                    <td className="py-3 px-4 font-semibold text-white bg-slate-900 border-r border-slate-800 sticky left-0 z-10">
                      {day.name}
                    </td>
                    {timeSlots.map((slot) => {
                      const key = `${day.id}_${slot.id}`;
                      const entry = facultyMatrix.get(key);
                      const isNonTeach = slot.isBreak || slot.isLunch;

                      return (
                        <td key={slot.id} className="p-1.5 border-l border-slate-800/60 align-top min-h-[96px]">
                          {isNonTeach ? (
                            <div className="h-full min-h-[80px] bg-slate-950/40 rounded-xl flex items-center justify-center text-[10px] uppercase font-semibold text-slate-600">
                              {slot.isLunch ? "Lunch" : "Break"}
                            </div>
                          ) : entry ? (
                            <div
                              onClick={() => setInspectedEntry(entry)}
                              className="cursor-pointer p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-1"
                            >
                              <div className="font-semibold text-white truncate">
                                {entry.subjectName || entry.title}
                              </div>
                              <div className="text-[11px] text-indigo-400 font-medium">
                                {entry.className}
                              </div>
                              {entry.resourceName && (
                                <div className="text-[10px] text-slate-500">
                                  {entry.resourceName}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-full min-h-[80px] rounded-xl border border-slate-900/60 flex items-center justify-center text-slate-700">
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENT MASTER GRID */}
      {activeTab === "master" && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex items-center justify-between text-xs text-slate-400">
            <span>High-level overview across all classes in the department</span>
            <span>{masterView.classes.length} Classes • {masterView.entries.length} Scheduled Periods</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40 shadow-xl">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4 text-left w-36 sticky left-0 bg-slate-900 z-10">Class</th>
                  {workingDays.map((d) => (
                    <th key={d.id} className="py-3 px-3 text-center border-l border-slate-800/80">
                      {d.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {masterView.classes.map((c) => {
                  const classEntries = masterView.entries.filter((e) => e.classId === c.id);
                  return (
                    <tr key={c.id} className="hover:bg-slate-900/20 transition">
                      <td className="py-3 px-4 font-semibold text-white bg-slate-900 border-r border-slate-800 sticky left-0 z-10">
                        {c.name}
                      </td>
                      {workingDays.map((d) => {
                        const dayPeriods = classEntries.filter((e) => e.workingDayId === d.id);
                        return (
                          <td key={d.id} className="p-2 border-l border-slate-800/60 align-top">
                            <div className="flex flex-wrap gap-1">
                              {dayPeriods.map((p) => (
                                <span
                                  key={p.id}
                                  onClick={() => setInspectedEntry(p)}
                                  className="cursor-pointer px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 font-mono transition"
                                  title={`${p.subjectName || p.title} (${p.timeSlotName})`}
                                >
                                  {p.subjectCode || p.title || "ACT"}
                                </span>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: WORKLOAD & ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Workload Stats */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
            <h3 className="text-sm font-semibold text-white mb-4 pb-3 border-b border-slate-800 flex items-center justify-between">
              <span>Faculty Workload Utilization</span>
              <span className="text-xs text-slate-400 font-normal">
                {tt.stats?.facultyWorkloadUtilization?.length ?? 0} Faculty Allocated
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold text-[10px]">
                    <th className="p-3">Faculty Name</th>
                    <th className="p-3 text-center">Scheduled Hours</th>
                    <th className="p-3 text-center">Max Allowed</th>
                    <th className="p-3 text-right">Workload Load</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tt.stats?.facultyWorkloadUtilization?.map((f) => {
                    const pct = Math.min(100, Math.round(f.utilizationPercent));
                    return (
                      <tr key={f.facultyId} className="hover:bg-slate-800/20">
                        <td className="p-3 font-semibold text-white">{f.facultyName}</td>
                        <td className="p-3 text-center font-mono font-bold text-indigo-400">
                          {f.scheduledHours} hrs
                        </td>
                        <td className="p-3 text-center text-slate-400">{f.maxWeeklyHours} hrs</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pct > 90 ? "bg-amber-500" : "bg-indigo-500"
                                }`}
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-slate-300 w-10 text-right">
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Class Coverage Stats */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
            <h3 className="text-sm font-semibold text-white mb-4 pb-3 border-b border-slate-800 flex items-center justify-between">
              <span>Class Schedule Completeness</span>
              <span className="text-xs text-slate-400 font-normal">
                {tt.stats?.classCoverage?.length ?? 0} Cohort Classes
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold text-[10px]">
                    <th className="p-3">Class Name</th>
                    <th className="p-3 text-center">Required Periods</th>
                    <th className="p-3 text-center">Scheduled Periods</th>
                    <th className="p-3 text-right">Coverage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tt.stats?.classCoverage?.map((c) => {
                    const pct = Math.min(100, Math.round(c.coveragePercent));
                    return (
                      <tr key={c.classId} className="hover:bg-slate-800/20">
                        <td className="p-3 font-semibold text-white">{c.className}</td>
                        <td className="p-3 text-center text-slate-400">{c.requiredSubjectPeriods}</td>
                        <td className="p-3 text-center font-bold text-indigo-400">
                          {c.scheduledSubjectPeriods}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-emerald-400 w-10 text-right">
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* INSPECTOR MODAL */}
      {inspectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-sm text-white">Period Slot Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedEntry(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {inspectedEntry.subjectCode || inspectedEntry.title || "ACTIVITY"}
                </span>

                <span
                  className={`font-semibold px-2 py-0.5 rounded text-[10px] uppercase ${
                    inspectedEntry.isFixed
                      ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  }`}
                >
                  {inspectedEntry.isFixed ? "Fixed Slot (Pinned)" : "Optimized Period"}
                </span>

                {inspectedEntry.isLocked && !inspectedEntry.isFixed && (
                  <span className="font-semibold px-2 py-0.5 rounded text-[10px] uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    Manually Locked
                  </span>
                )}
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Subject / Title</div>
                <div className="text-sm font-semibold text-white mt-0.5">
                  {inspectedEntry.subjectName || inspectedEntry.title || "Academic Session"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Class</div>
                  <div className="font-medium text-slate-200 mt-0.5">
                    {inspectedEntry.className || "Class Cohort"}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Day & Time</div>
                  <div className="font-medium text-slate-200 mt-0.5">
                    {inspectedEntry.dayName}, {inspectedEntry.startTime} - {inspectedEntry.endTime}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Faculty Staff</div>
                  <div className="font-medium text-slate-200 mt-0.5">
                    {inspectedEntry.facultyNames?.join(", ") || "None assigned"}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Room / Lab</div>
                  <div className="font-medium text-slate-200 mt-0.5">
                    {inspectedEntry.resourceName || "Standard Classroom"}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-800/20 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedEntry(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOVE ENTRY DIALOG (MOBILE / ACCESSIBILITY) */}
      <MoveEntryDialog
        isOpen={moveDialogOpen}
        onClose={() => setMoveDialogOpen(false)}
        timetableId={timetableId}
        entry={selectedEntryForMove}
        workingDays={workingDays}
        timeSlots={timeSlots}
        currentRevision={currentRevision}
        onMoveSuccess={() => {
          toast.showToast("Period moved successfully!", "success");
          loadData();
        }}
      />

      {/* SWAP CONFIRM DIALOG */}
      <SwapConfirmDialog
        isOpen={swapDialogOpen}
        onClose={() => {
          setSwapDialogOpen(false);
          setSwapPair(null);
        }}
        timetableId={timetableId}
        firstEntry={swapPair?.first || null}
        secondEntry={swapPair?.second || null}
        currentRevision={currentRevision}
        onSwapSuccess={() => {
          toast.showToast("Periods swapped successfully!", "success");
          loadData();
        }}
      />

      {/* MANUAL ADD ENTRY MODAL */}
      <ManualAddEntryModal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setAddCellContext(null);
        }}
        timetableId={timetableId}
        classId={selectedClassId}
        className={selectedClass?.name || "Class"}
        workingDayId={addCellContext?.dayId || ""}
        workingDayName={addCellContext?.dayName || ""}
        timeSlotId={addCellContext?.slotId || ""}
        timeSlotName={addCellContext?.slotName || ""}
        currentRevision={currentRevision}
        onAddSuccess={() => {
          toast.showToast("Period assigned successfully!", "success");
          loadData();
        }}
      />

      {/* REMOVE CONFIRM MODAL */}
      <RemoveConfirmModal
        isOpen={removeModalOpen}
        onClose={() => {
          setRemoveModalOpen(false);
          setSelectedEntryForRemove(null);
        }}
        timetableId={timetableId}
        entry={selectedEntryForRemove}
        currentRevision={currentRevision}
        onRemoveSuccess={() => {
          toast.showToast("Period removed. Timetable marked for repair.", "info");
          loadData();
        }}
      />

      {/* CHANGE HISTORY DRAWER */}
      <ChangeHistoryDrawer
        isOpen={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        timetableId={timetableId}
        currentRevision={currentRevision}
        onHistoryActionSuccess={() => {
          toast.showToast("Undo completed. Previous timetable state restored.", "success");
          loadData();
        }}
      />

      {/* PARTIAL REGENERATION MODAL */}
      <PartialRegenerationModal
        isOpen={regenModalOpen}
        onClose={() => setRegenModalOpen(false)}
        timetableId={timetableId}
        classes={masterView.classes}
        workingDays={workingDays}
        currentRevision={currentRevision}
        onApplySuccess={() => {
          toast.showToast("Partial regeneration applied successfully!", "success");
          loadData();
        }}
      />
      {/* PUBLISH CONFIRM DIALOG */}
      <PublishConfirmDialog
        isOpen={publishDialogOpen}
        onClose={() => setPublishDialogOpen(false)}
        onConfirm={handlePublishConfirm}
        isLoading={isPublishing}
        timetableVersion={tt.version}
      />
    </AdminLayout>
  );
}
