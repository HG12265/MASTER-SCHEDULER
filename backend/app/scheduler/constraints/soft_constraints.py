from collections import defaultdict
from typing import Any, Dict, List, Tuple
from ortools.sat.python import cp_model
from app.scheduler.types import SchedulerInputData, NormalizedBlock, NormalizedSlot


class SoftConstraintsBuilder:
    def __init__(
        self,
        model: cp_model.CpModel,
        data: SchedulerInputData,
        session_vars: Dict[Tuple[int, int, int], cp_model.IntVar],
        sessions: List[Dict[str, Any]],
        occupancy_data: Dict[str, Any],
    ):
        self.model = model
        self.data = data
        self.session_vars = session_vars
        self.sessions = sessions
        self.occupancy_data = occupancy_data

    def build_objective_terms(self) -> Tuple[List[cp_model.LinearExpr], Dict[str, Any]]:
        """
        Builds integer reward and penalty terms based on scheduling settings:
        1. Preferred / Avoid Faculty Availability
        2. First / Last Period Avoidance
        3. Subject Distribution across Days (avoid same subject twice on same day)
        4. Subject Day & Time Slot Preferences
        5. Faculty Daily Workload Balance
        6. Lab Block Continuity
        """
        weights = self.data.settings.get("softConstraintWeights", {})
        w_pref_avail = int(weights.get("preferredAvailability", 8))
        w_avoid_avail = int(weights.get("avoidAvailability", 5))
        w_avoid_first = int(weights.get("avoidFirstPeriod", 2))
        w_avoid_last = int(weights.get("avoidLastPeriod", 3))
        w_distrib = int(weights.get("subjectDistribution", 8))
        w_lab_block = int(weights.get("labBlockContinuity", 9))

        objective_terms: List[cp_model.LinearExpr] = []
        metrics: Dict[str, Any] = {
            "preferredAvailabilityBonus": 0,
            "avoidAvailabilityPenalty": 0,
            "periodPreferenceBonus": 0,
            "distributionBonus": 0,
        }

        # 1. Preferred & Avoid Availability & Period Placement
        min_slot_order = min((s.slot_order for s in self.data.slots), default=1)
        max_slot_order = max((s.slot_order for s in self.data.slots), default=7)

        # Subject constraints lookup
        sub_cons_map = self.data.subject_constraints

        for s_idx, session in enumerate(self.sessions):
            c_id = session["class_id"]
            s_id = session["subject_id"]
            fac_ids = session["faculty_ids"]
            s_cons = sub_cons_map.get((c_id, s_id), {})
            pref_days = set(s_cons.get("preferredWorkingDayIds", []))
            avoid_days = set(s_cons.get("avoidWorkingDayIds", []))
            pref_slots = set(s_cons.get("preferredTimeSlotIds", []))
            avoid_slots = set(s_cons.get("avoidTimeSlotIds", []))

            for b in session["candidate_blocks"]:
                var = self.session_vars.get((s_idx, b.block_idx))
                if var is None:
                    continue

                term_score = 0

                # Check Availability for all faculty in block
                for slot_idx in b.slot_indices:
                    slot_doc = self.data.slot_by_idx.get(slot_idx)
                    if not slot_doc:
                        continue

                    for f_id in fac_ids:
                        status = self.data.faculty_availability.get((f_id, slot_doc.working_day_id, slot_doc.time_slot_id), "AVAILABLE")
                        if status == "PREFERRED":
                            term_score += w_pref_avail
                        elif status == "AVOID":
                            term_score -= w_avoid_avail

                    # Subject Slot Preference
                    if slot_doc.time_slot_id in pref_slots:
                        term_score += 4
                    elif slot_doc.time_slot_id in avoid_slots:
                        term_score -= 4

                # First / Last Period Avoidance
                first_slot = self.data.slot_by_idx.get(b.start_slot_idx)
                last_slot = self.data.slot_by_idx.get(b.slot_indices[-1])

                if first_slot and first_slot.slot_order == min_slot_order:
                    # Check if faculty prefers to avoid first period
                    for f_id in fac_ids:
                        f_cons = self.data.faculty_constraints.get(f_id, {})
                        if f_cons.get("avoidFirstPeriod") or self.data.settings.get("avoidFirstPeriodForFaculty"):
                            term_score -= w_avoid_first

                if last_slot and last_slot.slot_order == max_slot_order:
                    for f_id in fac_ids:
                        f_cons = self.data.faculty_constraints.get(f_id, {})
                        if f_cons.get("avoidLastPeriod") or self.data.settings.get("avoidLastPeriodForFaculty"):
                            term_score -= w_avoid_last

                # Subject Day Preference
                if b.working_day_id in pref_days:
                    term_score += 5
                elif b.working_day_id in avoid_days:
                    term_score -= 5

                # Lab Block Continuity Reward
                if session["block_size"] > 1:
                    term_score += w_lab_block

                if term_score != 0:
                    objective_terms.append(term_score * var)

        # 2. Subject Distribution across Week
        # Penalize having the same subject scheduled multiple times on the same day for a class
        class_subject_day_vars: Dict[Tuple[str, str, str], List[cp_model.IntVar]] = defaultdict(list)
        for s_idx, session in enumerate(self.sessions):
            c_id = session["class_id"]
            s_id = session["subject_id"]
            for b in session["candidate_blocks"]:
                var = self.session_vars.get((s_idx, b.block_idx))
                if var is not None:
                    class_subject_day_vars[(c_id, s_id, b.working_day_id)].append(var)

        for (c_id, s_id, d_id), var_list in class_subject_day_vars.items():
            if len(var_list) > 1:
                # Same subject can be placed in multiple sessions on this day
                # Introduce indicator / penalty for sum(var_list) > 1
                excess = self.model.new_int_var(0, len(var_list), f"excess_{c_id}_{s_id}_{d_id}")
                self.model.add(sum(var_list) - 1 <= excess)
                objective_terms.append(-w_distrib * 3 * excess)

        return objective_terms, metrics
