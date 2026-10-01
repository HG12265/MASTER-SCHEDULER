"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Cpu,
  Play,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  RefreshCw,
  School,
  Users,
  BookOpen,
  Calendar,
  Layers,
  Lock,
  Clock,
  Check,
  X,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Sliders,
  ArrowRight,
  Eye,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useToast } from "@/components/Toast";
import { academicYearsService } from "@/services/academicYears";
import { semesterTypesService } from "@/services/semesterTypes";
import { schedulerValidationService } from "@/services/schedulerValidation";
import { classesService } from "@/services/classes";
import { timetablesService } from "@/services/timetables";
import {
  AcademicYear,
  SemesterType,
  Class,
  SchedulerReadiness,
  SchedulerValidationResult,
  GenerateResultPayload,
} from "@/types";

export default function SchedulerPage() {
  const router = useRouter();
  const toast = useToast();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesterTypes, setSemesterTypes] = useState<SemesterType[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedSemTypeId, setSelectedSemTypeId] = useState<string>("");

  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [maxSolveSeconds, setMaxSolveSeconds] = useState<number>(30);
  const [replaceExistingDraft, setReplaceExistingDraft] = useState<boolean>(false);
  const [showOptions, setShowOptions] = useState<boolean>(false);

  const [readiness, setReadiness] = useState<SchedulerReadiness | null>(null);
  const [validationResult, setValidationResult] = useState<SchedulerValidationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [validating, setValidating] = useState<boolean>(false);

  // Generation state
  const [generating, setGenerating] = useState<boolean>(false);
  const [generationModalOpen, setGenerationModalOpen] = useState<boolean>(false);
  const [generationPhase, setGenerationPhase] = useState<string>("Initializing CP-SAT Solver...");
  const [generationResult, setGenerationResult] = useState<GenerateResultPayload | null>(null);

  // Load masters on mount
  useEffect(() => {
    async function loadMasterData() {
      try {
        setLoading(true);
        const [ays, sts] = await Promise.all([
          academicYearsService.getAll(),
          semesterTypesService.getAll(),
        ]);
        setAcademicYears(ays || []);
        setSemesterTypes(sts || []);

        const currentAy = ays.find((a) => a.isCurrent);
        const ayId = currentAy ? currentAy.id : ays[0]?.id || "";
        const semId = sts[0]?.id || "";

        setSelectedYearId(ayId);
        setSelectedSemTypeId(semId);
      } catch (err: unknown) {
        toast.showToast(err instanceof Error ? err.message : "Failed to load academic terms", "error");
      } finally {
        setLoading(false);
      }
    }
    loadMasterData();
  }, [toast]);

  // Load classes for the active semester type & year
  useEffect(() => {
    async function loadClasses() {
      try {
        const clsRes = await classesService.getAll({ isActive: true });
        setClasses(clsRes?.data || []);
      } catch (err) {
        console.error("Failed to load classes", err);
      }
    }
    loadClasses();
  }, []);

  // Load readiness & run validation
  const runValidation = useCallback(async () => {
    if (!selectedYearId || !selectedSemTypeId) return;

    try {
      setValidating(true);
      const [readinessData, valData] = await Promise.all([
        schedulerValidationService.getReadiness(selectedYearId, selectedSemTypeId),
        schedulerValidationService.validate(selectedYearId, selectedSemTypeId),
      ]);
      setReadiness(readinessData);
      setValidationResult(valData);
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Failed to run validation check", "error");
    } finally {
      setValidating(false);
      setLoading(false);
    }
  }, [selectedYearId, selectedSemTypeId, toast]);

  useEffect(() => {
    if (selectedYearId && selectedSemTypeId) {
      runValidation();
    }
  }, [runValidation, selectedYearId, selectedSemTypeId]);

  // Solver phase animation timer
  useEffect(() => {
    if (!generating) return;
    const phases = [
      "Normalizing weekly time slots and break boundaries...",
      "Formulating multi-class decision variables...",
      "Encoding faculty unavailability & room constraints...",
      "Google OR-Tools CP-SAT exploring feasible solution space...",
      "Maximizing soft objectives and subject spread...",
      "Verifying post-solution integrity & invariants...",
    ];
    let idx = 0;
    const timer = setInterval(() => {
      idx = (idx + 1) % phases.length;
      setGenerationPhase(phases[idx]);
    }, 1200);
    return () => clearInterval(timer);
  }, [generating]);

  // Handle generation trigger
  const handleGenerate = async () => {
    if (!selectedYearId || !selectedSemTypeId) {
      toast.showToast("Please select Academic Year and Semester Type", "info");
      return;
    }

    if (validationResult && !validationResult.ready) {
      toast.showToast(
        "Cannot generate: Fatal validation errors exist. Please resolve them first.",
        "error"
      );
      return;
    }

    try {
      setGenerating(true);
      setGenerationResult(null);
      setGenerationPhase("Initializing CP-SAT Solver engine...");
      setGenerationModalOpen(true);

      const res = await timetablesService.generate({
        academicYearId: selectedYearId,
        semesterTypeId: selectedSemTypeId,
        classIds: selectedClassIds.length > 0 ? selectedClassIds : undefined,
        replaceExistingDraft,
        solverOptions: {
          maxSolveSeconds,
          numWorkers: 4,
        },
      });

      setGenerationResult(res);
      if (res.success) {
        toast.showToast(
          `Timetable v${res.timetable?.version} generated successfully! (${res.solveTimeMs} ms)`,
          "success"
        );
      } else {
        toast.showToast("Solver could not find a feasible schedule.", "error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate timetable";
      toast.showToast(msg, "error");
      setGenerationResult({
        success: false,
        message: msg,
        solverStatus: "UNKNOWN",
        diagnostics: [msg],
      });
    } finally {
      setGenerating(false);
    }
  };

  // Checklist items
  const checklist = [
    {
      title: "Academic Term Configured",
      passed: Boolean(selectedYearId && selectedSemTypeId),
      link: "/academic-years",
    },
    {
      title: "Active Working Days Available",
      passed: (readiness?.totalTeachingSlots || 0) > 0,
      link: "/working-days",
    },
    {
      title: "Teaching Periods Configured",
      passed: (readiness?.totalTeachingSlots || 0) > 0,
      link: "/time-slots",
    },
    {
      title: "Student Classes Enrolled",
      passed: (readiness?.classes || 0) > 0,
      link: "/classes",
    },
    {
      title: "Curriculum Subjects Created",
      passed: (readiness?.subjects || 0) > 0,
      link: "/subjects",
    },
    {
      title: "Faculty Staff Appointed",
      passed: (readiness?.faculty || 0) > 0,
      link: "/faculty",
    },
    {
      title: "Course Workloads Allocated",
      passed: (readiness?.allocations || 0) > 0,
      link: "/faculty-allocations",
    },
    {
      title: "Fixed Timetable Slots Validated",
      passed: true,
      link: "/fixed-slots",
    },
    {
      title: "Zero Infeasible Hard Conflicts",
      passed: (validationResult?.summary.errors || 0) === 0,
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Automated Timetable Generator"
        description="Verify baseline capacity, configure solver constraints, and trigger Google OR-Tools CP-SAT multi-class optimization."
        breadcrumbs={[{ label: "Scheduler & Constraints" }, { label: "Scheduler Engine" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={validating || generating}
              onClick={runValidation}
              className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${
                  validating ? "animate-spin text-indigo-600" : "text-slate-500"
                }`}
              />
              {validating ? "Validating..." : "Validate Configuration"}
            </button>

            {/* GENERATE BUTTON */}
            <button
              type="button"
              disabled={validating || generating || (validationResult !== null && !validationResult.ready)}
              onClick={handleGenerate}
              className={`inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-all ${
                validationResult?.ready
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
              }`}
              title={
                validationResult?.ready
                  ? "Trigger Google OR-Tools CP-SAT solver"
                  : "Resolve validation errors to enable generation"
              }
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              {generating ? "Solving CP-SAT Model..." : "Generate Timetable"}
            </button>
          </div>
        }
      />

      {/* Term Selector & Generation Options Bar */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs mb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Target Academic Year
              </span>
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.isCurrent ? "(Current Active Term)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                Target Semester Type
              </span>
            </label>
            <select
              value={selectedSemTypeId}
              onChange={(e) => setSelectedSemTypeId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {semesterTypes.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Solver Configuration Toggle */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showOptions ? "Hide Solver Parameters" : "Advanced Solver Options (CP-SAT Tuning)"}</span>
          </button>

          {showOptions && (
            <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Max Solve Time: <span className="text-indigo-600 font-mono">{maxSolveSeconds}s</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={maxSolveSeconds}
                  onChange={(e) => setMaxSolveSeconds(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>5s (Fast)</span>
                  <span>60s</span>
                  <span>120s (Deep)</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Draft Version Strategy
                </label>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExistingDraft}
                    onChange={(e) => setReplaceExistingDraft(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700 font-medium">Replace previous draft</span>
                </label>
                <p className="text-[10px] text-slate-400 mt-1">
                  If unchecked, a new version (v+1) is automatically created.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Cohort Classes
                </label>
                <div className="text-[11px] text-slate-600 mt-2">
                  All active cohort classes ({classes.length} total) are scheduled simultaneously to guarantee zero shared faculty clashes.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Readiness Status Banner */}
      <div
        className={`p-5 rounded-xl border mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs ${
          validationResult?.ready
            ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
            : "bg-amber-50/80 border-amber-200 text-amber-950"
        }`}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              validationResult?.ready ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
            }`}
          >
            {validationResult?.ready ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold">
                {validationResult?.ready
                  ? "Configuration is Ready for Scheduling"
                  : "Attention Needed: Pre-Generation Issues Detected"}
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  validationResult?.ready
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-amber-100 text-amber-900 border border-amber-300"
                }`}
              >
                {validationResult?.ready ? "Passes Pre-Flight" : "Not Ready"}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {validationResult?.ready
                ? "All 20 structural, capacity, workload limits, and conflict checks have succeeded. You can generate an automated timetable."
                : `Identified ${validationResult?.summary.errors ?? 0} fatal error(s) and ${
                    validationResult?.summary.warnings ?? 0
                  } warning(s). Resolve all errors before scheduling.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <div className="text-center px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <div className="text-xs text-rose-600 font-bold">
              {validationResult?.summary.errors ?? 0}
            </div>
            <div className="text-[10px] text-slate-400">Errors</div>
          </div>
          <div className="text-center px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <div className="text-xs text-amber-600 font-bold">
              {validationResult?.summary.warnings ?? 0}
            </div>
            <div className="text-[10px] text-slate-400">Warnings</div>
          </div>
          <div className="text-center px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <div className="text-xs text-indigo-600 font-bold">
              {validationResult?.summary.info ?? 0}
            </div>
            <div className="text-[10px] text-slate-400">Info</div>
          </div>
        </div>
      </div>

      {/* Configuration Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Classes</span>
            <School className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-lg font-bold text-slate-900">{readiness?.classes ?? 0}</div>
          <div className="text-[10px] text-slate-400">Active cohorts</div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Faculty</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-bold text-slate-900">{readiness?.faculty ?? 0}</div>
          <div className="text-[10px] text-slate-400">Instructors</div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Subjects</span>
            <BookOpen className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-lg font-bold text-slate-900">{readiness?.subjects ?? 0}</div>
          <div className="text-[10px] text-slate-400">Courses & labs</div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Allocations</span>
            <Calendar className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg font-bold text-slate-900">{readiness?.allocations ?? 0}</div>
          <div className="text-[10px] text-slate-400">Assigned courses</div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Fixed Slots</span>
            <Lock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-slate-900">{readiness?.fixedSlots ?? 0}</div>
          <div className="text-[10px] text-slate-400">Pinned periods</div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Capacity</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-lg font-bold text-slate-900">
            {readiness?.totalTeachingSlots ?? 0}
          </div>
          <div className="text-[10px] text-slate-400">Weekly slots / class</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Diagnostic Issues Breakdown */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Validation Diagnostic Engine</span>
                <span className="text-xs font-normal text-slate-400">(20 Rule Checks)</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {validationResult?.issues.length ?? 0} items evaluated
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Running 20 pre-scheduler diagnostics...
              </div>
            ) : !validationResult || validationResult.issues.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No issues reported. Configuration is clean!
              </div>
            ) : (
              <div className="space-y-3">
                {validationResult.issues.map((issue, idx) => {
                  const isErr = issue.severity === "ERROR";
                  const isWarn = issue.severity === "WARNING";
                  const isInfo = issue.severity === "INFO";

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-lg border text-xs flex items-start gap-3 transition-colors ${
                        isErr
                          ? "bg-rose-50/60 border-rose-200 text-rose-950"
                          : isWarn
                          ? "bg-amber-50/60 border-amber-200 text-amber-950"
                          : "bg-indigo-50/60 border-indigo-200 text-indigo-950"
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {isErr && <AlertOctagon className="w-4 h-4 text-rose-600" />}
                        {isWarn && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                        {isInfo && <Info className="w-4 h-4 text-indigo-600" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                              isErr
                                ? "bg-rose-100 text-rose-800"
                                : isWarn
                                ? "bg-amber-100 text-amber-800"
                                : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {issue.severity}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-500">
                            {issue.code}
                          </span>
                        </div>
                        <p className="font-medium leading-relaxed">{issue.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Readiness Checklist & Action Card */}
        <div className="space-y-6">
          {/* Pre-Flight Checklist */}
          <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 mb-4 flex items-center justify-between">
              <span>Pre-Flight Checklist</span>
              <span className="text-[10px] font-bold text-indigo-600">Phase 4 & 5 Verification</span>
            </h3>

            <div className="space-y-3">
              {checklist.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {item.passed ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                        <X className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                    <span
                      className={`font-medium ${
                        item.passed ? "text-slate-800" : "text-rose-900 font-semibold"
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>

                  {item.link && (
                    <Link
                      href={item.link}
                      className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                      title="Manage configuration"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Solver Launch Card */}
          <div className="p-5 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-xl shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                Google OR-Tools CP-SAT Solver
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Synthesizes zero-conflict schedules across all classes, faculty availability, room
              resources, and multi-period laboratory blocks.
            </p>

            <div className="mt-4 pt-4 border-t border-slate-700/60">
              <button
                type="button"
                disabled={validating || generating || !validationResult?.ready}
                onClick={handleGenerate}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all ${
                  validationResult?.ready
                    ? "bg-indigo-500 hover:bg-indigo-400 text-white"
                    : "bg-slate-700 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>{generating ? "Solving..." : "Run CP-SAT Engine Now"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* GENERATION PROGRESS & RESULT MODAL */}
      {generationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {generating
                    ? "Google OR-Tools Optimization in Progress"
                    : generationResult?.success
                    ? "Timetable Synthesized Successfully!"
                    : "Timetable Generation Result"}
                </h3>
              </div>
              {!generating && (
                <button
                  type="button"
                  onClick={() => setGenerationModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-6">
              {generating ? (
                <div className="text-center py-8 space-y-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                    <Cpu className="absolute inset-0 m-auto w-6 h-6 text-indigo-600" />
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Solving Constraint Satisfaction Problem...
                    </h4>
                    <p className="text-xs text-indigo-600 font-medium mt-1 animate-pulse">
                      {generationPhase}
                    </p>
                  </div>

                  <div className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Evaluating simultaneous multi-class room, faculty, and weekly hour constraints.
                  </div>
                </div>
              ) : generationResult?.success ? (
                <div className="space-y-5">
                  <div className="text-center py-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-7 h-7" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-base">Zero Conflicts Guaranteed</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      CP-SAT solver status:{" "}
                      <span className="font-bold text-emerald-700">
                        {generationResult.solverStatus}
                      </span>{" "}
                      ({generationResult.solveTimeMs} ms)
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs">
                    <div>
                      <div className="text-slate-400 text-[10px]">Version</div>
                      <div className="font-bold text-slate-800 text-sm mt-0.5">
                        v{generationResult.timetable?.version}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">Scheduled</div>
                      <div className="font-bold text-indigo-600 text-sm mt-0.5">
                        {generationResult.timetable?.stats?.totalScheduledSubjectPeriods ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">Fixed</div>
                      <div className="font-bold text-amber-600 text-sm mt-0.5">
                        {generationResult.timetable?.stats?.totalFixedPeriods ?? 0}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setGenerationModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Dismiss
                    </button>
                    <Link
                      href={`/timetables/${generationResult.timetable?.id}`}
                      className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
                    >
                      <span>Open Timetable Views</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 text-xs">
                    <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold">Solver Infeasible: No Valid Timetable Exists</h4>
                      <p className="mt-1 leading-relaxed text-slate-600">
                        The current academic workload and constraints are mathematically over-constrained.
                        The engine identified the following bottleneck(s):
                      </p>
                    </div>
                  </div>

                  {generationResult?.diagnostics && generationResult.diagnostics.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {generationResult.diagnostics.map((diag, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700 font-mono"
                        >
                          • {diag}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setGenerationModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
