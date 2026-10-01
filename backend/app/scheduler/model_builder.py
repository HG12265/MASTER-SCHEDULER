from collections import defaultdict
from typing import Any, Dict, List, Set, Tuple
from ortools.sat.python import cp_model
from app.scheduler.types import (
    SchedulerInputData,
    NormalizedSlot,
    NormalizedBlock,
    NormalizedAllocation,
)
from app.scheduler.constraints.hard_constraints import HardConstraintsBuilder
from app.scheduler.constraints.soft_constraints import SoftConstraintsBuilder
from app.scheduler.objective import ObjectiveBuilder


class SchedulerModelBuilder:
    def __init__(self, data: SchedulerInputData):
        self.data = data
        self.model = cp_model.CpModel()
        self.sessions: List[Dict[str, Any]] = []
        self.session_vars: Dict[Tuple[int, int], cp_model.IntVar] = {}

    def build_model(self) -> Tuple[cp_model.CpModel, Dict[Tuple[int, int], cp_model.IntVar], List[Dict[str, Any]]]:
        # 1. Decompose allocations into discrete session instances
        session_idx = 0

        # Fixed slot quick lookup sets for filtering
        fixed_class_slots: Set[Tuple[str, int]] = {
            (fs.class_id, fs.slot_idx) for fs in self.data.fixed_slots
        }
        fixed_faculty_slots: Set[Tuple[str, int]] = {
            (fid, fs.slot_idx) for fs in self.data.fixed_slots for fid in fs.faculty_ids
        }
        fixed_resource_slots: Set[Tuple[str, int]] = {
            (fs.resource_id, fs.slot_idx) for fs in self.data.fixed_slots if fs.resource_id
        }

        # Class constraint blocked slot IDs
        class_blocked_slots: Dict[str, Set[str]] = defaultdict(set)
        for cid, c_cons in self.data.class_constraints.items():
            class_blocked_slots[cid] = set(c_cons.get("blockedSlotIds", []))

        for alloc in self.data.allocations:
            rem_hours = alloc.effective_remaining_hours
            if rem_hours <= 0:
                continue

            block_sz = alloc.block_size if alloc.requires_consecutive and alloc.block_size > 1 else 1
            num_blocks = rem_hours // block_sz
            remainder = rem_hours % block_sz

            # Session sizes to create
            session_sizes = [block_sz] * num_blocks
            if remainder > 0:
                session_sizes.append(remainder)

            for sz in session_sizes:
                # Fetch candidate precomputed blocks of size `sz`
                candidate_blocks = []
                all_blocks_of_sz = self.data.valid_blocks_by_size.get(sz, [])

                for b in all_blocks_of_sz:
                    # Check 1: No fixed slot in the class during this block
                    has_fixed_cls = any((alloc.class_id, s_idx) in fixed_class_slots for s_idx in b.slot_indices)
                    if has_fixed_cls:
                        continue

                    # Check 2: No class constraint blocked slot
                    blocked_in_cls = any(
                        self.data.slot_by_idx[s_idx].time_slot_id in class_blocked_slots[alloc.class_id]
                        for s_idx in b.slot_indices
                        if s_idx in self.data.slot_by_idx
                    )
                    if blocked_in_cls:
                        continue

                    # Check 3: Faculty unavailability or fixed conflict in another class
                    fac_clash = False
                    for f_id in alloc.faculty_ids:
                        for s_idx in b.slot_indices:
                            slot_obj = self.data.slot_by_idx.get(s_idx)
                            if not slot_obj:
                                continue

                            # Unavailable status
                            st = self.data.faculty_availability.get((f_id, slot_obj.working_day_id, slot_obj.time_slot_id), "AVAILABLE")
                            if st == "UNAVAILABLE":
                                fac_clash = True
                                break

                            # Fixed slot in another class
                            if (f_id, s_idx) in fixed_faculty_slots:
                                fac_clash = True
                                break
                        if fac_clash:
                            break
                    if fac_clash:
                        continue

                    # Check 4: Resource conflict with fixed slot
                    if alloc.preferred_resource_id:
                        res_clash = any((alloc.preferred_resource_id, s_idx) in fixed_resource_slots for s_idx in b.slot_indices)
                        if res_clash:
                            continue

                    candidate_blocks.append(b)

                session_entry = {
                    "session_idx": session_idx,
                    "alloc_idx": alloc.alloc_idx,
                    "allocation_id": alloc.allocation_id,
                    "class_id": alloc.class_id,
                    "subject_id": alloc.subject_id,
                    "faculty_ids": alloc.faculty_ids,
                    "resource_id": alloc.preferred_resource_id,
                    "block_size": sz,
                    "candidate_blocks": candidate_blocks,
                    "subject_type": alloc.subject_type,
                    "subject_name": alloc.subject_name,
                    "subject_code": alloc.subject_code,
                    "class_name": alloc.class_name,
                }
                self.sessions.append(session_entry)
                session_idx += 1

        # 2. Instantiate CP-SAT decision variables for each session
        for session in self.sessions:
            s_idx = session["session_idx"]
            for b in session["candidate_blocks"]:
                var_name = f"sess_{s_idx}_blk_{b.block_idx}"
                self.session_vars[(s_idx, b.block_idx)] = self.model.new_bool_var(var_name)

        # 3. Apply Hard Constraints
        hard_builder = HardConstraintsBuilder(
            model=self.model,
            data=self.data,
            session_vars=self.session_vars,
            sessions=self.sessions,
        )
        occupancy_data = hard_builder.apply_all()

        # 4. Apply Soft Constraints & Objective
        soft_builder = SoftConstraintsBuilder(
            model=self.model,
            data=self.data,
            session_vars=self.session_vars,
            sessions=self.sessions,
            occupancy_data=occupancy_data,
        )
        obj_terms, _ = soft_builder.build_objective_terms()

        # 5. Maximize Objective
        ObjectiveBuilder(self.model).set_objective(obj_terms)

        return self.model, self.session_vars, self.sessions
