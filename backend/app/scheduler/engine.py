import logging
import time
from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple
from ortools.sat.python import cp_model
from app.scheduler.data_loader import scheduler_data_loader
from app.scheduler.model_builder import SchedulerModelBuilder
from app.scheduler.solution_extractor import solution_extractor
from app.scheduler.diagnostics import infeasibility_diagnostics
from app.scheduler.types import SchedulerInputData, SchedulerOutput
from app.utils.exceptions import ConflictException

logger = logging.getLogger(__name__)


class SchedulerEngine:
    async def generate_timetable(
        self,
        academic_year_id: str,
        semester_type_id: str,
        class_ids: Optional[List[str]] = None,
        max_solve_seconds: int = 30,
        num_workers: int = 4,
        random_seed: Optional[int] = 42,
    ) -> SchedulerOutput:
        start_time = time.perf_counter()
        logger.info(
            "Starting timetable generation for term AY=%s, SemType=%s, classes=%s",
            academic_year_id,
            semester_type_id,
            class_ids or "ALL",
        )

        # 1. Load Normalized In-Memory Scheduler Data
        data: SchedulerInputData = await scheduler_data_loader.load_data(
            academic_year_id=academic_year_id,
            semester_type_id=semester_type_id,
            class_ids=class_ids,
        )

        # 2. Build CP-SAT Model
        builder = SchedulerModelBuilder(data)
        model, session_vars, sessions = builder.build_model()
        logger.info(
            "CP-SAT model built successfully: %d sessions, %d candidate variables",
            len(sessions),
            len(session_vars),
        )

        # 3. Configure CP-SAT Solver
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = float(max_solve_seconds)
        solver.parameters.num_search_workers = int(num_workers)
        if random_seed is not None:
            solver.parameters.random_seed = int(random_seed)

        # 4. Execute Solver
        solve_start = time.perf_counter()
        status_code = solver.solve(model)
        solve_duration_ms = int((time.perf_counter() - solve_start) * 1000)

        status_map = {
            cp_model.OPTIMAL: "OPTIMAL",
            cp_model.FEASIBLE: "FEASIBLE",
            cp_model.INFEASIBLE: "INFEASIBLE",
            cp_model.UNKNOWN: "UNKNOWN",
            cp_model.MODEL_INVALID: "UNKNOWN",
        }
        status_name = status_map.get(status_code, "UNKNOWN")
        logger.info("Solver completed in %d ms with status: %s", solve_duration_ms, status_name)

        total_duration_ms = int((time.perf_counter() - start_time) * 1000)

        # 5. Handle Infeasible / Unknown
        if status_code not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            diagnostics = infeasibility_diagnostics.analyze(data, sessions)
            return SchedulerOutput(
                solver_status=status_name,
                objective_value=None,
                entries=[],
                diagnostics=diagnostics,
                duration_ms=total_duration_ms,
                stats={
                    "totalClasses": len(data.class_map),
                    "totalScheduledSubjectPeriods": 0,
                    "totalFixedPeriods": len(data.fixed_slots),
                    "totalAllocatedPeriods": sum(a.weekly_hours for a in data.allocations),
                },
            )

        # 6. Extract Solution
        output = solution_extractor.extract_solution(
            solver=solver,
            data=data,
            sessions=sessions,
            session_vars=session_vars,
            status_name=status_name,
            duration_ms=total_duration_ms,
        )

        # 7. Post-Solution Integrity Verification
        self.verify_solution_integrity(output, data)

        logger.info(
            "Timetable solution extracted and verified: %d total entries",
            len(output.entries),
        )
        return output

    def verify_solution_integrity(self, output: SchedulerOutput, data: SchedulerInputData):
        """
        Independent verification safety layer validating all invariants on the extracted solution:
        - Class uniqueness per slot
        - Faculty uniqueness per slot
        - Resource uniqueness per slot
        - No unavailable faculty scheduled
        - Weekly hours per allocation satisfied
        """
        class_slots: Set[Tuple[str, str, str]] = set()
        faculty_slots: Set[Tuple[str, str, str]] = set()
        resource_slots: Set[Tuple[str, str, str]] = set()
        allocation_hours: Dict[str, int] = defaultdict(int)

        for entry in output.entries:
            key_suffix = (entry.working_day_id, entry.time_slot_id)
            c_key = (entry.class_id,) + key_suffix

            # 1. Class uniqueness
            if c_key in class_slots:
                raise ConflictException(f"Post-verification error: Class {entry.class_id} double-booked at {key_suffix}")
            class_slots.add(c_key)

            # 2. Faculty uniqueness & availability
            for fid in entry.faculty_ids:
                f_key = (fid,) + key_suffix
                if f_key in faculty_slots:
                    raise ConflictException(f"Post-verification error: Faculty {fid} scheduled in overlapping classes at {key_suffix}")
                faculty_slots.add(f_key)

                # Availability check
                avail = data.faculty_availability.get((fid, entry.working_day_id, entry.time_slot_id), "AVAILABLE")
                if avail == "UNAVAILABLE" and not entry.is_fixed:
                    raise ConflictException(f"Post-verification error: Faculty {fid} scheduled during UNAVAILABLE period at {key_suffix}")

            # 3. Resource uniqueness
            if entry.resource_id:
                r_key = (entry.resource_id,) + key_suffix
                if r_key in resource_slots:
                    raise ConflictException(f"Post-verification error: Resource {entry.resource_id} double-booked at {key_suffix}")
                resource_slots.add(r_key)

            # 4. Track hours for allocations
            if entry.allocation_id:
                allocation_hours[entry.allocation_id] += 1

        # 5. Verify weekly hours per allocation (scheduled generated + fixed)
        for a in data.allocations:
            sched_hrs = allocation_hours.get(a.allocation_id, 0) + a.fixed_periods_count
            if sched_hrs != a.weekly_hours:
                raise ConflictException(
                    f"Post-verification error: Allocation '{a.subject_name}' ({a.class_name}) requires {a.weekly_hours} hrs, but received {sched_hrs} hrs."
                )


scheduler_engine = SchedulerEngine()
