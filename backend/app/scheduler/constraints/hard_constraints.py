from collections import defaultdict
from typing import Any, Dict, List, Set, Tuple
from ortools.sat.python import cp_model
from app.scheduler.types import (
    SchedulerInputData,
    NormalizedSlot,
    NormalizedBlock,
    NormalizedAllocation,
)


class HardConstraintsBuilder:
    def __init__(
        self,
        model: cp_model.CpModel,
        data: SchedulerInputData,
        session_vars: Dict[Tuple[int, int, int], cp_model.IntVar],
        sessions: List[Dict[str, Any]],
    ):
        self.model = model
        self.data = data
        self.session_vars = session_vars  # (session_idx, block_idx) -> bool_var
        self.sessions = sessions

    def apply_all(self) -> Dict[str, Any]:
        """
        Applies all core CP-SAT hard constraints:
        1. Exact Session Allocation (every required session must be placed)
        2. Class Conflict (at most 1 class activity per slot)
        3. Faculty Conflict (no simultaneous teaching across classes; multi-faculty synchronization)
        4. Resource Conflict (no facility double-booking)
        5. Faculty Daily Max Workload
        6. Faculty Consecutive Teaching Limits
        7. Class Daily and Consecutive Limits
        """
        # Map: (class_id, slot_idx) -> list of session_vars that occupy this slot
        class_slot_occupancy: Dict[Tuple[str, int], List[cp_model.IntVar]] = defaultdict(list)

        # Map: (faculty_id, slot_idx) -> list of session_vars
        faculty_slot_occupancy: Dict[Tuple[str, int], List[cp_model.IntVar]] = defaultdict(list)

        # Map: (resource_id, slot_idx) -> list of session_vars
        resource_slot_occupancy: Dict[Tuple[str, int], List[cp_model.IntVar]] = defaultdict(list)

        # Map: (faculty_id, day_id) -> list of (block_size, var)
        faculty_day_sessions: Dict[Tuple[str, str], List[Tuple[int, cp_model.IntVar]]] = defaultdict(list)

        # Map: (class_id, day_id) -> list of (block_size, var)
        class_day_sessions: Dict[Tuple[str, str], List[Tuple[int, cp_model.IntVar]]] = defaultdict(list)

        # 1. Exactly One Block Per Session
        for s_idx, session in enumerate(self.sessions):
            cand_vars = [
                self.session_vars[(s_idx, b.block_idx)]
                for b in session["candidate_blocks"]
                if (s_idx, b.block_idx) in self.session_vars
            ]
            if cand_vars:
                self.model.add(sum(cand_vars) == 1)

                # Populate slot occupancies
                for b in session["candidate_blocks"]:
                    var = self.session_vars.get((s_idx, b.block_idx))
                    if var is not None:
                        # Record day sessions
                        for f_id in session["faculty_ids"]:
                            faculty_day_sessions[(f_id, b.working_day_id)].append((session["block_size"], var))
                        class_day_sessions[(session["class_id"], b.working_day_id)].append((session["block_size"], var))

                        for s_slot_idx in b.slot_indices:
                            class_slot_occupancy[(session["class_id"], s_slot_idx)].append(var)
                            for f_id in session["faculty_ids"]:
                                faculty_slot_occupancy[(f_id, s_slot_idx)].append(var)
                            if session["resource_id"]:
                                resource_slot_occupancy[(session["resource_id"], s_slot_idx)].append(var)

        # Precompute fixed slot occupancy
        fixed_class_slots: Set[Tuple[str, int]] = set()
        fixed_faculty_slots: Set[Tuple[str, int]] = set()
        fixed_resource_slots: Set[Tuple[str, int]] = set()
        fixed_faculty_day_hours: Dict[Tuple[str, str], int] = defaultdict(int)
        fixed_class_day_hours: Dict[Tuple[str, str], int] = defaultdict(int)

        for fs in self.data.fixed_slots:
            fixed_class_slots.add((fs.class_id, fs.slot_idx))
            fixed_class_day_hours[(fs.class_id, fs.working_day_id)] += 1

            for f_id in fs.faculty_ids:
                fixed_faculty_slots.add((f_id, fs.slot_idx))
                fixed_faculty_day_hours[(f_id, fs.working_day_id)] += 1

            if fs.resource_id:
                fixed_resource_slots.add((fs.resource_id, fs.slot_idx))

        # 2. Hard Constraint 1: Class Conflict
        for (c_id, slot_idx), var_list in class_slot_occupancy.items():
            is_fixed = 1 if (c_id, slot_idx) in fixed_class_slots else 0
            if is_fixed:
                # If slot is already fixed, no generated session can occupy it
                self.model.add(sum(var_list) == 0)
            else:
                self.model.add(sum(var_list) <= 1)

        # 3. Hard Constraint 2: Faculty Conflict
        for (f_id, slot_idx), var_list in faculty_slot_occupancy.items():
            is_fixed = 1 if (f_id, slot_idx) in fixed_faculty_slots else 0
            if is_fixed:
                self.model.add(sum(var_list) == 0)
            else:
                self.model.add(sum(var_list) <= 1)

        # 4. Hard Constraint 7: Resource Conflict
        for (r_id, slot_idx), var_list in resource_slot_occupancy.items():
            is_fixed = 1 if (r_id, slot_idx) in fixed_resource_slots else 0
            if is_fixed:
                self.model.add(sum(var_list) == 0)
            else:
                self.model.add(sum(var_list) <= 1)

        # 5. Hard Constraint 9: Faculty Daily Workload Limit
        default_max_fac_daily = self.data.settings.get("maxFacultyHoursPerDay", 4)
        for (f_id, d_id), session_terms in faculty_day_sessions.items():
            fac_doc = self.data.faculty_map.get(f_id, {})
            max_daily = fac_doc.get("maxHoursPerDay") or default_max_fac_daily
            fixed_hrs = fixed_faculty_day_hours.get((f_id, d_id), 0)

            daily_expr = sum(sz * var for sz, var in session_terms) + fixed_hrs
            self.model.add(daily_expr <= max_daily)

        # 6. Hard Constraint 10: Faculty Consecutive Teaching Limit
        default_consec_fac = self.data.settings.get("maxFacultyConsecutiveHours", 3)
        # Check per day sliding window
        slots_by_day: Dict[str, List[NormalizedSlot]] = defaultdict(list)
        for s in self.data.slots:
            slots_by_day[s.working_day_id].append(s)

        for d_id, d_slots in slots_by_day.items():
            d_slots.sort(key=lambda s: s.slot_order)
            for f_id in self.data.faculty_map:
                fac_doc = self.data.faculty_map[f_id]
                max_consec = fac_doc.get("maxConsecutiveHours") or default_consec_fac
                w_size = max_consec + 1

                if w_size <= len(d_slots):
                    for i in range(len(d_slots) - w_size + 1):
                        window = d_slots[i : i + w_size]
                        # Check if window is strictly consecutive
                        if all(window[k + 1].slot_order == window[k].slot_order + 1 for k in range(w_size - 1)):
                            window_vars = []
                            window_fixed = 0
                            for ws in window:
                                if (f_id, ws.slot_idx) in fixed_faculty_slots:
                                    window_fixed += 1
                                vars_in_slot = faculty_slot_occupancy.get((f_id, ws.slot_idx), [])
                                window_vars.extend(vars_in_slot)

                            if window_vars or window_fixed > 0:
                                self.model.add(sum(window_vars) + window_fixed <= max_consec)

        # 7. Hard Constraint 11: Class Constraints (Daily Period Cap & Consecutive Limits)
        default_class_consec = self.data.settings.get("maxClassConsecutiveHours", 4)
        for c_id in self.data.class_map:
            c_cons = self.data.class_constraints.get(c_id, {})
            max_daily_cls = c_cons.get("maxPeriodsPerDay")
            max_consec_cls = c_cons.get("maxConsecutivePeriods") or default_class_consec

            # Daily cap
            if max_daily_cls is not None:
                for d_id in slots_by_day:
                    fixed_cls_hrs = fixed_class_day_hours.get((c_id, d_id), 0)
                    terms = class_day_sessions.get((c_id, d_id), [])
                    daily_expr = sum(sz * var for sz, var in terms) + fixed_cls_hrs
                    self.model.add(daily_expr <= max_daily_cls)

            # Consecutive cap
            for d_id, d_slots in slots_by_day.items():
                w_size = max_consec_cls + 1
                if w_size <= len(d_slots):
                    for i in range(len(d_slots) - w_size + 1):
                        window = d_slots[i : i + w_size]
                        if all(window[k + 1].slot_order == window[k].slot_order + 1 for k in range(w_size - 1)):
                            w_vars = []
                            w_fixed = 0
                            for ws in window:
                                if (c_id, ws.slot_idx) in fixed_class_slots:
                                    w_fixed += 1
                                vars_in_slot = class_slot_occupancy.get((c_id, ws.slot_idx), [])
                                w_vars.extend(vars_in_slot)

                            if w_vars or w_fixed > 0:
                                self.model.add(sum(w_vars) + w_fixed <= max_consec_cls)

        return {
            "class_slot_occupancy": class_slot_occupancy,
            "faculty_slot_occupancy": faculty_slot_occupancy,
            "resource_slot_occupancy": resource_slot_occupancy,
            "fixed_class_slots": fixed_class_slots,
            "fixed_faculty_slots": fixed_faculty_slots,
            "fixed_resource_slots": fixed_resource_slots,
        }
