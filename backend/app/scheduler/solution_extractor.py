from collections import defaultdict
from typing import Any, Dict, List, Set, Tuple
from ortools.sat.python import cp_model
from app.scheduler.types import (
    SchedulerInputData,
    GeneratedEntry,
    SchedulerOutput,
)


class SolutionExtractor:
    def extract_solution(
        self,
        solver: cp_model.CpSolver,
        data: SchedulerInputData,
        sessions: List[Dict[str, Any]],
        session_vars: Dict[Tuple[int, int], cp_model.IntVar],
        status_name: str,
        duration_ms: int,
    ) -> SchedulerOutput:
        entries: List[GeneratedEntry] = []

        # 1. Extract Solver Assigned Sessions
        for session in sessions:
            s_idx = session["session_idx"]
            for b in session["candidate_blocks"]:
                var = session_vars.get((s_idx, b.block_idx))
                if var is not None and solver.value(var) == 1:
                    # Session placed in block `b`
                    blk_id = f"blk_{session['allocation_id']}_{s_idx}"
                    blk_size = len(b.slot_indices)
                    for blk_idx, s_slot_idx in enumerate(b.slot_indices):
                        slot_doc = data.slot_by_idx[s_slot_idx]
                        entry = GeneratedEntry(
                            class_id=session["class_id"],
                            working_day_id=slot_doc.working_day_id,
                            time_slot_id=slot_doc.time_slot_id,
                            allocation_id=session["allocation_id"],
                            subject_id=session["subject_id"],
                            faculty_ids=session["faculty_ids"],
                            resource_id=session["resource_id"],
                            entry_type="SUBJECT",
                            title=session["subject_name"],
                            is_fixed=False,
                            is_generated=True,
                            block_id=blk_id,
                            block_size=blk_size,
                            block_index=blk_idx,
                            is_locked=False,
                            is_manually_locked=False,
                        )
                        entries.append(entry)
                    break

        # 2. Append Fixed Slots
        for fs in data.fixed_slots:
            slot_doc = data.slot_by_idx.get(fs.slot_idx)
            if not slot_doc:
                continue

            entry = GeneratedEntry(
                class_id=fs.class_id,
                working_day_id=fs.working_day_id,
                time_slot_id=fs.time_slot_id,
                allocation_id=None,
                subject_id=fs.subject_id,
                faculty_ids=fs.faculty_ids,
                resource_id=fs.resource_id,
                entry_type=fs.slot_category,
                title=fs.title,
                is_fixed=True,
                is_generated=False,
            )
            entries.append(entry)

        # 3. Calculate Workload and Coverage Statistics
        faculty_hours: Dict[str, int] = defaultdict(int)
        class_subject_hours: Dict[str, int] = defaultdict(int)
        class_fixed_hours: Dict[str, int] = defaultdict(int)

        total_subject_periods = 0
        total_fixed_periods = 0

        for e in entries:
            if e.is_fixed and e.entry_type != "SUBJECT":
                total_fixed_periods += 1
                class_fixed_hours[e.class_id] += 1
            else:
                total_subject_periods += 1
                class_subject_hours[e.class_id] += 1

            for fid in e.faculty_ids:
                faculty_hours[fid] += 1

        # Class coverage stats
        class_coverage_list = []
        for cls_id, cls_doc in data.class_map.items():
            req_hours = sum(a.weekly_hours for a in data.allocations if a.class_id == cls_id)
            sched_hours = class_subject_hours.get(cls_id, 0)
            fixed_acts = class_fixed_hours.get(cls_id, 0)
            cov_pct = round((sched_hours / req_hours * 100), 1) if req_hours > 0 else 100.0

            class_coverage_list.append({
                "classId": cls_id,
                "className": cls_doc.get("name", "Class"),
                "requiredSubjectPeriods": req_hours,
                "scheduledSubjectPeriods": sched_hours,
                "fixedActivities": fixed_acts,
                "coveragePercent": cov_pct,
            })

        # Faculty workload stats
        faculty_workload_list = []
        for fid, fac_doc in data.faculty_map.items():
            # Check allocations for this faculty
            req_hours = sum(a.weekly_hours for a in data.allocations if fid in a.faculty_ids)
            sched_hours = faculty_hours.get(fid, 0)
            max_limit = fac_doc.get("maxHoursPerWeek", 16)
            util_pct = round((sched_hours / max_limit * 100), 1) if max_limit > 0 else 0.0

            if req_hours > 0 or sched_hours > 0:
                faculty_workload_list.append({
                    "facultyId": fid,
                    "facultyName": fac_doc.get("name", "Faculty"),
                    "facultyCode": fac_doc.get("facultyCode", "FAC"),
                    "requiredHours": req_hours,
                    "scheduledHours": sched_hours,
                    "maxWeeklyHours": max_limit,
                    "utilizationPercent": util_pct,
                })

        total_alloc_periods = sum(a.weekly_hours for a in data.allocations)

        obj_val = None
        try:
            obj_val = float(solver.objective_value)
        except Exception:
            obj_val = None

        stats = {
            "totalClasses": len(data.class_map),
            "totalScheduledSubjectPeriods": total_subject_periods,
            "totalFixedPeriods": total_fixed_periods,
            "totalAllocatedPeriods": total_alloc_periods,
            "facultyWorkloadUtilization": faculty_workload_list,
            "classCoverage": class_coverage_list,
        }

        return SchedulerOutput(
            solver_status=status_name,
            objective_value=obj_val,
            entries=entries,
            diagnostics=[],
            duration_ms=duration_ms,
            stats=stats,
        )


solution_extractor = SolutionExtractor()
