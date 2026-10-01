from collections import defaultdict
from typing import Any, Dict, List, Set
from app.scheduler.types import SchedulerInputData


class InfeasibilityDiagnostics:
    def analyze(self, data: SchedulerInputData, sessions: List[Dict[str, Any]]) -> List[str]:
        diagnostics: List[str] = []

        # 1. Check for sessions with 0 candidate blocks
        for session in sessions:
            if len(session["candidate_blocks"]) == 0:
                fac_names = [
                    data.faculty_map.get(fid, {}).get("name", fid)
                    for fid in session["faculty_ids"]
                ]
                fac_str = f" taught by {', '.join(fac_names)}" if fac_names else ""
                diagnostics.append(
                    f"Possible cause: Subject '{session['subject_name']}' in class '{session['class_name']}'{fac_str} has 0 feasible placement blocks. "
                    f"Check if required block size ({session['block_size']}) cannot fit around break/lunch periods, or if all potential slots conflict with fixed activities, unavailable hours, or class blocked periods."
                )

        # 2. Check Faculty Availability vs Required Hours
        faculty_required: Dict[str, int] = defaultdict(int)
        for a in data.allocations:
            for fid in a.faculty_ids:
                faculty_required[fid] += a.weekly_hours

        total_slots_count = len(data.slots)
        for fid, req_hrs in faculty_required.items():
            fac_doc = data.faculty_map.get(fid, {})
            # Count unavailable slots
            unavail_count = sum(
                1 for (f, d, t), status in data.faculty_availability.items()
                if f == fid and status == "UNAVAILABLE"
            )
            avail_slots = total_slots_count - unavail_count
            if avail_slots < req_hrs:
                diagnostics.append(
                    f"Possible cause: Faculty '{fac_doc.get('name', fid)}' requires {req_hrs} teaching periods, but only has {avail_slots} available slots after subtracting {unavail_count} UNAVAILABLE period(s)."
                )

        # 3. Check Class Capacity vs Required Periods
        class_required: Dict[str, int] = defaultdict(int)
        for a in data.allocations:
            class_required[a.class_id] += a.weekly_hours

        for cid, req_hrs in class_required.items():
            cls_doc = data.class_map.get(cid, {})
            # Fixed slots in this class
            fixed_cnt = sum(1 for fs in data.fixed_slots if fs.class_id == cid and fs.slot_category != "SUBJECT")
            # Blocked slots in this class
            c_cons = data.class_constraints.get(cid, {})
            blocked_cnt = len(c_cons.get("blockedSlotIds", []))

            usable_capacity = total_slots_count - fixed_cnt - blocked_cnt
            if usable_capacity < req_hrs:
                diagnostics.append(
                    f"Possible cause: Class '{cls_doc.get('name', cid)}' requires {req_hrs} periods, but only has {usable_capacity} free slots remaining after accounting for {fixed_cnt} fixed non-subject activities and {blocked_cnt} blocked slot(s)."
                )

        if not diagnostics:
            diagnostics.append(
                "Possible cause: A combination of simultaneous faculty commitments across classes, maximum consecutive lecture caps, or daily period limits produced a dead-end with no conflict-free solution."
            )

        return diagnostics


infeasibility_diagnostics = InfeasibilityDiagnostics()
