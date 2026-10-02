from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Set
from app.repositories.substitution_repository import substitution_repository
from app.repositories.leave_request_repository import leave_request_repository
from app.repositories.faculty_repository import faculty_repository
from app.repositories.timetable_repository import timetable_repository
from app.repositories.class_repository import class_repository
from app.repositories.subject_repository import subject_repository
from app.repositories.time_slot_repository import time_slot_repository
from app.repositories.working_day_repository import working_day_repository
from app.repositories.resource_repository import resource_repository
from app.repositories.faculty_allocation_repository import faculty_allocation_repository
from app.repositories.faculty_availability_repository import faculty_availability_repository
from app.repositories.base_repository import BaseRepository
from app.schemas.substitution import (
    SubstitutionCreate,
    SubstitutionResponse,
    SubstituteCandidate,
    SubstitutionCandidateResponse,
    EmergencyAbsenceCreate,
    DailyScheduleSession,
    DailyScheduleSummary,
    CandidateReason,
    SubstitutionStatus,
    AssignmentType,
)
from app.services.academic_calendar_service import academic_calendar_service
from app.services.notification_service import notification_service
from app.services.audit_service import audit_service
from app.services.leave_request_service import leave_request_service
from app.schemas.leave_request import LeaveRequestCreate, LeaveType
from app.utils.exceptions import NotFoundException, BadRequestException, ConflictException
from app.utils.logger import get_logger

logger = get_logger(__name__)

entry_repository = BaseRepository("timetable_entries")


class SubstitutionService:
    def __init__(self):
        self.repo = substitution_repository

    async def _format_substitution(self, doc: Dict[str, Any]) -> SubstitutionResponse:
        absent_fac = await faculty_repository.get_by_id(doc.get("absentFacultyId", ""))
        sub_fac = await faculty_repository.get_by_id(doc.get("substituteFacultyId", "")) if doc.get("substituteFacultyId") else None
        cls = await class_repository.get_by_id(doc.get("classId", ""))
        sub = await subject_repository.get_by_id(doc.get("subjectId", ""))
        slot = await time_slot_repository.get_by_id(doc.get("timeSlotId", ""))
        wd = await working_day_repository.get_by_id(doc.get("workingDayId", ""))
        res = await resource_repository.get_by_id(doc.get("resourceId", "")) if doc.get("resourceId") else None

        return SubstitutionResponse(
            id=str(doc.get("id") or doc.get("_id")),
            date=str(doc.get("date", "")),
            publishedTimetableId=str(doc.get("publishedTimetableId", "")),
            originalEntryId=str(doc.get("originalEntryId", "")),
            absentFacultyId=str(doc.get("absentFacultyId", "")),
            absentFacultyName=absent_fac.get("name") if absent_fac else None,
            substituteFacultyId=doc.get("substituteFacultyId"),
            substituteFacultyName=sub_fac.get("name") if sub_fac else None,
            classId=str(doc.get("classId", "")),
            className=cls.get("name") if cls else None,
            subjectId=str(doc.get("subjectId", "")),
            subjectName=sub.get("name") if sub else None,
            subjectCode=sub.get("subjectCode") if sub else None,
            workingDayId=str(doc.get("workingDayId", "")),
            workingDayName=wd.get("name") if wd else None,
            timeSlotId=str(doc.get("timeSlotId", "")),
            timeSlotName=slot.get("name") if slot else None,
            startTime=slot.get("startTime") if slot else None,
            endTime=slot.get("endTime") if slot else None,
            resourceId=doc.get("resourceId"),
            resourceName=res.get("name") if res else None,
            status=str(doc.get("status", "ASSIGNED")),
            assignmentType=str(doc.get("assignmentType", "SUBSTITUTION")),
            notes=doc.get("notes"),
            createdBy=doc.get("createdBy"),
            createdAt=doc.get("createdAt").isoformat() if isinstance(doc.get("createdAt"), datetime) else str(doc.get("createdAt")) if doc.get("createdAt") else None,
            updatedAt=doc.get("updatedAt").isoformat() if isinstance(doc.get("updatedAt"), datetime) else str(doc.get("updatedAt")) if doc.get("updatedAt") else None,
        )

    async def list_substitutions(
        self,
        date_filter: Optional[str] = None,
        faculty_id: Optional[str] = None,
        class_id: Optional[str] = None,
        status_filter: Optional[str] = None,
    ) -> List[SubstitutionResponse]:
        query: Dict[str, Any] = {}
        if date_filter:
            query["date"] = date_filter
        if faculty_id:
            query["$or"] = [{"absentFacultyId": faculty_id}, {"substituteFacultyId": faculty_id}]
        if class_id:
            query["classId"] = class_id
        if status_filter:
            query["status"] = status_filter

        docs = await self.repo.find_many(query, sort=[("date", -1), ("createdAt", -1)])
        return [await self._format_substitution(d) for d in docs]

    async def find_candidates(self, date_str: str, entry_id: str) -> SubstitutionCandidateResponse:
        entry = await entry_repository.get_by_id(entry_id)
        if not entry:
            raise NotFoundException("TimetableEntry", entry_id)

        working_day_id = entry.get("workingDayId")
        time_slot_id = entry.get("timeSlotId")
        class_id = entry.get("classId")
        subject_id = entry.get("subjectId")
        timetable_id = entry.get("timetableId")
        absent_fac_ids = entry.get("facultyIds", [])
        primary_absent_id = absent_fac_ids[0] if absent_fac_ids else ""

        absent_fac = await faculty_repository.get_by_id(primary_absent_id) if primary_absent_id else None
        cls_doc = await class_repository.get_by_id(class_id)
        sub_doc = await subject_repository.get_by_id(subject_id)
        slot_doc = await time_slot_repository.get_by_id(time_slot_id)

        # 1. Fetch all active faculty
        all_faculty = await faculty_repository.find_many({"isActive": True})

        # 2. Check who is on approved leave for this date and slot
        approved_leaves = await leave_request_repository.get_active_approved_leaves_for_date(date_str)
        leave_faculty_ids: Set[str] = set()
        for lv in approved_leaves:
            if lv.get("fullDay", True):
                leave_faculty_ids.add(str(lv.get("facultyId")))
            else:
                affected_slots = lv.get("affectedTimeSlotIds", [])
                if time_slot_id in affected_slots:
                    leave_faculty_ids.add(str(lv.get("facultyId")))

        # 3. Check who is already teaching at this slot on this effective working day in published timetables
        busy_entries = await entry_repository.find_many({
            "timetableId": timetable_id,
            "workingDayId": working_day_id,
            "timeSlotId": time_slot_id,
            "isActive": True,
        })
        busy_faculty_ids: Set[str] = set()
        for be in busy_entries:
            for fid in be.get("facultyIds", []):
                busy_faculty_ids.add(str(fid))

        # 4. Check who is already assigned as a substitute at this date and slot
        assigned_subs = await self.repo.find_many({
            "date": date_str,
            "timeSlotId": time_slot_id,
            "status": "ASSIGNED",
        })
        for asub in assigned_subs:
            sub_fid = asub.get("substituteFacultyId")
            if sub_fid:
                busy_faculty_ids.add(str(sub_fid))

        # 5. Fetch allocations for subject & class
        subject_allocations = await faculty_allocation_repository.find_many({"subjectId": subject_id})
        subject_alloc_faculty_ids: Set[str] = set()
        for sa in subject_allocations:
            for fid in sa.get("facultyIds", []):
                subject_alloc_faculty_ids.add(str(fid))

        class_allocations = await faculty_allocation_repository.find_many({"classId": class_id})
        class_alloc_faculty_ids: Set[str] = set()
        for ca in class_allocations:
            for fid in ca.get("facultyIds", []):
                class_alloc_faculty_ids.add(str(fid))

        # 6. Fetch faculty unavailability for this slot
        unavailabilities = await faculty_availability_repository.find_many({
            "workingDayId": working_day_id,
            "timeSlotId": time_slot_id,
            "isAvailable": False,
        })
        unavailable_faculty_ids: Set[str] = {str(u.get("facultyId")) for u in unavailabilities}

        # 7. Evaluate each candidate
        candidates: List[SubstituteCandidate] = []

        for f in all_faculty:
            fid = str(f.get("id") or f.get("_id"))
            # Exclude absent faculty themselves
            if fid in absent_fac_ids:
                continue

            # Hard filter 1: On approved leave
            if fid in leave_faculty_ids:
                continue

            # Hard filter 2: Already teaching or substituting at this slot
            if fid in busy_faculty_ids:
                continue

            # Hard filter 3: Marked unavailable in faculty availability
            if fid in unavailable_faculty_ids:
                continue

            # Calculate daily load for this faculty on this date
            day_entries = await entry_repository.find_many({
                "timetableId": timetable_id,
                "workingDayId": working_day_id,
                "facultyIds": fid,
                "isActive": True,
            })
            day_subs = await self.repo.get_active_substitutions_for_faculty(fid, date_str)
            periods_today = len(day_entries) + len(day_subs)

            # Weekly load
            weekly_entries = await entry_repository.find_many({
                "timetableId": timetable_id,
                "facultyIds": fid,
                "isActive": True,
            })
            weekly_load = len(weekly_entries)

            # Match scoring
            score = 100
            reasons_list: List[str] = []
            reasons_structured: List[CandidateReason] = []

            # Reason 1: Free during this period
            reasons_list.append(f"Free during {slot_doc.get('name', 'this period')}")
            reasons_structured.append(CandidateReason(
                category="Availability",
                detail=f"Free during {slot_doc.get('name', 'this period')}",
                isPositive=True
            ))

            is_sub_alloc = fid in subject_alloc_faculty_ids
            if is_sub_alloc:
                score += 50
                reasons_list.append(f"Allocated to {sub_doc.get('name', 'this subject')}")
                reasons_structured.append(CandidateReason(
                    category="Subject Allocation",
                    detail=f"Allocated to {sub_doc.get('name', 'this subject')}",
                    isPositive=True
                ))

            is_cls_alloc = fid in class_alloc_faculty_ids
            if is_cls_alloc:
                score += 30
                reasons_list.append(f"Teaches other subjects in {cls_doc.get('name', 'this class')}")
                reasons_structured.append(CandidateReason(
                    category="Class Allocation",
                    detail=f"Teaches other subjects in {cls_doc.get('name', 'this class')}",
                    isPositive=True
                ))

            # Department match
            is_prog_alloc = False
            if f.get("department") and cls_doc and cls_doc.get("programmeName"):
                if f.get("department").lower() in cls_doc.get("programmeName", "").lower():
                    is_prog_alloc = True
                    score += 15
                    reasons_list.append(f"Same department ({f.get('department')})")
                    reasons_structured.append(CandidateReason(
                        category="Department",
                        detail=f"Same department ({f.get('department')})",
                        isPositive=True
                    ))

            # Workload preference: fewer periods today is better
            load_factor = max(0, 5 - periods_today) * 5
            score += load_factor
            reasons_list.append(f"Currently scheduled for {periods_today} period(s) today")
            reasons_structured.append(CandidateReason(
                category="Daily Workload",
                detail=f"Scheduled for {periods_today} period(s) today",
                isPositive=periods_today < 4
            ))

            candidates.append(
                SubstituteCandidate(
                    facultyId=fid,
                    facultyName=f.get("name", "Faculty"),
                    facultyCode=f.get("facultyCode", ""),
                    department=f.get("department"),
                    designation=f.get("designation"),
                    matchScore=score,
                    isAllocatedToSubject=is_sub_alloc,
                    isAllocatedToClass=is_cls_alloc,
                    isAllocatedToProgramme=is_prog_alloc,
                    scheduledPeriodsToday=periods_today,
                    weeklyScheduledHours=weekly_load,
                    reasons=reasons_list,
                    reasonsStructured=reasons_structured,
                )
            )

        # Sort by matchScore descending
        candidates.sort(key=lambda c: c.matchScore, reverse=True)

        return SubstitutionCandidateResponse(
            date=date_str,
            originalEntryId=entry_id,
            absentFacultyId=primary_absent_id,
            absentFacultyName=absent_fac.get("name", "") if absent_fac else "",
            classId=class_id,
            className=cls_doc.get("name", "Class") if cls_doc else "",
            subjectId=subject_id,
            subjectName=sub_doc.get("name", "Subject") if sub_doc else "",
            timeSlotId=time_slot_id,
            timeSlotName=slot_doc.get("name", "Period") if slot_doc else "",
            startTime=slot_doc.get("startTime", "") if slot_doc else "",
            endTime=slot_doc.get("endTime", "") if slot_doc else "",
            candidates=candidates,
        )

    async def assign_substitution(
        self,
        payload: SubstitutionCreate,
        current_user: Optional[Dict[str, Any]] = None,
    ) -> SubstitutionResponse:
        entry = await entry_repository.get_by_id(payload.originalEntryId)
        if not entry:
            raise NotFoundException("TimetableEntry", payload.originalEntryId)

        timetable_id = entry.get("timetableId")
        tt = await timetable_repository.get_by_id(timetable_id)
        if not tt or tt.get("status") != "PUBLISHED":
            raise BadRequestException("Substitutions can only be assigned for published timetables")

        absent_fac_id = entry.get("facultyIds", [None])[0]

        # Final conflict check if assigning a substitute faculty
        if payload.assignmentType == AssignmentType.SUBSTITUTION and payload.substituteFacultyId:
            sub_fac_id = payload.substituteFacultyId

            # 1. Check if substitute is absent on leave
            approved_leaves = await leave_request_repository.get_active_approved_leaves_for_date(payload.date)
            for lv in approved_leaves:
                if str(lv.get("facultyId")) == sub_fac_id:
                    if lv.get("fullDay", True) or entry.get("timeSlotId") in lv.get("affectedTimeSlotIds", []):
                        raise ConflictException("Candidate is on approved leave for this date/period")

            # 2. Check if substitute is already teaching another class at that slot
            busy_entries = await entry_repository.find_many({
                "timetableId": timetable_id,
                "workingDayId": entry.get("workingDayId"),
                "timeSlotId": entry.get("timeSlotId"),
                "facultyIds": sub_fac_id,
                "isActive": True,
            })
            if busy_entries:
                raise ConflictException("Substitute faculty already has another scheduled class at this time")

            # 3. Check if substitute already assigned another substitution at that date/slot
            existing_sub = await self.repo.find_one({
                "date": payload.date,
                "timeSlotId": entry.get("timeSlotId"),
                "substituteFacultyId": sub_fac_id,
                "status": "ASSIGNED",
                "originalEntryId": {"$ne": payload.originalEntryId},
            })
            if existing_sub:
                raise ConflictException("Substitute faculty is already assigned to another substitution at this time")

        # Check if a substitution record already exists for this date and entry
        existing_record = await self.repo.get_by_date_and_entry(payload.date, payload.originalEntryId)

        sub_data = {
            "date": payload.date,
            "publishedTimetableId": timetable_id,
            "originalEntryId": payload.originalEntryId,
            "absentFacultyId": absent_fac_id,
            "substituteFacultyId": payload.substituteFacultyId,
            "classId": entry.get("classId"),
            "subjectId": entry.get("subjectId"),
            "workingDayId": entry.get("workingDayId"),
            "timeSlotId": entry.get("timeSlotId"),
            "resourceId": entry.get("resourceId"),
            "status": SubstitutionStatus.ASSIGNED.value,
            "assignmentType": payload.assignmentType.value if hasattr(payload.assignmentType, "value") else str(payload.assignmentType),
            "notes": payload.notes,
            "createdBy": current_user.get("username") if current_user else "ADMIN",
        }

        if existing_record:
            rec_id = str(existing_record.get("id") or existing_record.get("_id"))
            saved = await self.repo.update_by_id(rec_id, sub_data)
        else:
            saved = await self.repo.create(sub_data)

        # Notify substitute faculty
        if payload.substituteFacultyId:
            cls_doc = await class_repository.get_by_id(entry.get("classId"))
            sub_doc = await subject_repository.get_by_id(entry.get("subjectId"))
            slot_doc = await time_slot_repository.get_by_id(entry.get("timeSlotId"))

            await notification_service.notify_faculty(
                faculty_id=payload.substituteFacultyId,
                notif_type="SUBSTITUTE_ASSIGNED",
                title="Substitute Teaching Assigned",
                message=f"You have been assigned as substitute for {cls_doc.get('name', 'Class')} ({sub_doc.get('name', 'Subject')}) on {payload.date} at {slot_doc.get('name', 'Period')}.",
                related_entity_type="Substitution",
                related_entity_id=str(saved.get("id") or saved.get("_id")),
            )

        # Log audit
        await audit_service.log_action(
            action="SUBSTITUTION_ASSIGNED",
            entity_type="Substitution",
            entity_id=str(saved.get("id") or saved.get("_id")),
            description=f"Substitution assigned for {payload.date} ({payload.assignmentType})",
            user=current_user,
            metadata={"date": payload.date, "substituteFacultyId": payload.substituteFacultyId, "originalEntryId": payload.originalEntryId},
        )

        return await self._format_substitution(saved)

    async def cancel_substitution(
        self,
        substitution_id: str,
        current_user: Optional[Dict[str, Any]] = None,
    ) -> SubstitutionResponse:
        doc = await self.repo.get_by_id(substitution_id)
        if not doc:
            raise NotFoundException("Substitution", substitution_id)

        updated = await self.repo.update_by_id(substitution_id, {
            "status": SubstitutionStatus.CANCELLED.value,
        })

        if doc.get("substituteFacultyId"):
            await notification_service.notify_faculty(
                faculty_id=doc["substituteFacultyId"],
                notif_type="SUBSTITUTION_CANCELLED",
                title="Substitute Assignment Cancelled",
                message=f"Your substitute assignment on {doc.get('date')} has been cancelled.",
                related_entity_type="Substitution",
                related_entity_id=substitution_id,
            )

        await audit_service.log_action(
            action="SUBSTITUTION_CANCELLED",
            entity_type="Substitution",
            entity_id=substitution_id,
            description=f"Substitution cancelled for {doc.get('date')}",
            user=current_user,
        )

        return await self._format_substitution(updated)

    async def emergency_faculty_absence(
        self,
        payload: EmergencyAbsenceCreate,
        current_user: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Emergency workflow: Mark faculty absent today, automatically creating an approved leave record
        and identifying all affected periods for immediate substitution.
        """
        leave_payload = LeaveRequestCreate(
            facultyId=payload.facultyId,
            leaveType=LeaveType.OTHER,
            startDate=payload.date,
            endDate=payload.date,
            fullDay=payload.fullDay,
            affectedTimeSlotIds=payload.affectedTimeSlotIds or [],
            reason=f"[EMERGENCY ABSENCE] {payload.reason}",
        )

        # Create leave request
        created_leave = await leave_request_service.create_leave_request(leave_payload, current_user=current_user)

        # Immediately approve leave
        approved_leave = await leave_request_service.approve_leave_request(
            leave_id=created_leave.id,
            review_notes="Auto-approved via Emergency Faculty Absence workflow",
            current_user=current_user,
        )

        # Calculate affected periods
        impact = await leave_request_service.get_leave_impact(approved_leave.id)

        # Notify admins
        fac = await faculty_repository.get_by_id(payload.facultyId)
        fac_name = fac.get("name") if fac else "Faculty"
        await notification_service.notify_all_admins(
            notif_type="EMERGENCY_ABSENCE",
            title="Emergency Faculty Absence Recorded",
            message=f"{fac_name} marked absent on {payload.date}. {impact.totalAffectedPeriods} session(s) require substitution.",
            related_entity_type="LeaveRequest",
            related_entity_id=approved_leave.id,
        )

        return {
            "success": True,
            "leaveRequest": approved_leave,
            "impact": impact,
        }

    async def get_daily_operational_schedule(self, date_str: str) -> DailyScheduleSummary:
        """
        Computes the complete daily operational schedule for a specific date:
        - Resolves academic calendar exception / effective working day
        - Published timetable entries
        - Approved leaves
        - Substitutions and overrides
        - Operational session states (NORMAL, SUBSTITUTED, CANCELLED, ACTIVITY, UNRESOLVED)
        """
        lookup = await academic_calendar_service.resolve_date(date_str)

        if not lookup.isTeachingDay or not lookup.effectiveWorkingDayId:
            return DailyScheduleSummary(
                date=date_str,
                dayOfWeek=lookup.dayOfWeek,
                isTeachingDay=False,
                isException=lookup.isException,
                exceptionTitle=lookup.exceptionTitle,
                effectiveWorkingDayId=None,
                effectiveWorkingDayName=None,
                scheduledClassesCount=0,
                facultyOnLeaveCount=0,
                substitutionsCount=0,
                cancelledPeriodsCount=0,
                unresolvedPeriodsCount=0,
                facultyOnLeave=[],
                sessions=[],
            )

        effective_wd_id = lookup.effectiveWorkingDayId

        # 1. Fetch published timetables
        published_timetables = await timetable_repository.find_many({"status": "PUBLISHED"})

        # 2. Fetch all entries for this effective working day across published timetables
        entries: List[Dict[str, Any]] = []
        for tt in published_timetables:
            tt_id = str(tt.get("id") or tt.get("_id"))
            tt_entries = await entry_repository.find_many({
                "timetableId": tt_id,
                "workingDayId": effective_wd_id,
                "isActive": True,
            })
            entries.extend(tt_entries)

        # 3. Fetch approved leaves for this date
        approved_leaves = await leave_request_repository.get_active_approved_leaves_for_date(date_str)
        leave_map: Dict[str, Dict[str, Any]] = {}
        faculty_on_leave_list: List[Dict[str, Any]] = []

        for lv in approved_leaves:
            fid = str(lv.get("facultyId"))
            leave_map[fid] = lv
            fac = await faculty_repository.get_by_id(fid)
            faculty_on_leave_list.append({
                "facultyId": fid,
                "facultyName": fac.get("name") if fac else "Faculty",
                "facultyCode": fac.get("facultyCode") if fac else "",
                "leaveType": lv.get("leaveType"),
                "fullDay": lv.get("fullDay", True),
                "affectedTimeSlotIds": lv.get("affectedTimeSlotIds", []),
                "reason": lv.get("reason"),
            })

        # 4. Fetch substitutions for this date
        substitutions = await self.repo.get_for_date(date_str)
        sub_by_entry: Dict[str, Dict[str, Any]] = {}
        for sub in substitutions:
            if sub.get("status") in ["ASSIGNED", "PROPOSED"]:
                sub_by_entry[str(sub.get("originalEntryId"))] = sub

        # 5. Build daily operational sessions
        sessions: List[DailyScheduleSession] = []
        unique_classes: Set[str] = set()
        substitutions_count = 0
        cancelled_count = 0
        unresolved_count = 0

        for ent in entries:
            ent_id = str(ent.get("id") or ent.get("_id"))
            class_id = ent.get("classId")
            unique_classes.add(class_id)
            scheduled_fac_ids = ent.get("facultyIds", [])

            # Check names
            cls_doc = await class_repository.get_by_id(class_id)
            sub_doc = await subject_repository.get_by_id(ent.get("subjectId"))
            slot_doc = await time_slot_repository.get_by_id(ent.get("timeSlotId"))
            res_doc = await resource_repository.get_by_id(ent.get("resourceId")) if ent.get("resourceId") else None

            fac_names: List[str] = []
            for fid in scheduled_fac_ids:
                fdoc = await faculty_repository.get_by_id(fid)
                if fdoc:
                    fac_names.append(fdoc.get("name", "Faculty"))

            # Determine if any assigned faculty is on leave for this slot
            absent_fac_in_session: Optional[str] = None
            for fid in scheduled_fac_ids:
                if fid in leave_map:
                    lv_info = leave_map[fid]
                    if lv_info.get("fullDay", True) or ent.get("timeSlotId") in lv_info.get("affectedTimeSlotIds", []):
                        absent_fac_in_session = fid
                        break

            # Check substitution override
            sub_record = sub_by_entry.get(ent_id)

            session_status = "NORMAL"
            eff_fac_id = scheduled_fac_ids[0] if scheduled_fac_ids else None
            eff_fac_name = fac_names[0] if fac_names else None
            sub_id = None
            asg_type = None
            notes = None

            if absent_fac_in_session:
                if sub_record:
                    sub_id = str(sub_record.get("id") or sub_record.get("_id"))
                    asg_type = sub_record.get("assignmentType", "SUBSTITUTION")
                    notes = sub_record.get("notes")

                    if asg_type == AssignmentType.CANCELLED.value:
                        session_status = "CANCELLED"
                        cancelled_count += 1
                        eff_fac_id = None
                        eff_fac_name = None
                    elif asg_type == AssignmentType.ACTIVITY.value:
                        session_status = "ACTIVITY"
                        substitutions_count += 1
                    else:
                        session_status = "SUBSTITUTED"
                        substitutions_count += 1
                        eff_fac_id = sub_record.get("substituteFacultyId")
                        if eff_fac_id:
                            sf = await faculty_repository.get_by_id(eff_fac_id)
                            eff_fac_name = sf.get("name") if sf else None
                else:
                    # Absent and no substitute assigned -> UNRESOLVED!
                    session_status = "UNRESOLVED"
                    unresolved_count += 1

            sessions.append(
                DailyScheduleSession(
                    entryId=ent_id,
                    timetableId=ent.get("timetableId"),
                    classId=class_id,
                    className=cls_doc.get("name", "Class") if cls_doc else "Class",
                    subjectId=ent.get("subjectId"),
                    subjectName=sub_doc.get("name", "Subject") if sub_doc else "Subject",
                    subjectCode=sub_doc.get("subjectCode", "") if sub_doc else "",
                    timeSlotId=ent.get("timeSlotId"),
                    timeSlotName=slot_doc.get("name", "Period") if slot_doc else "Period",
                    startTime=slot_doc.get("startTime", "") if slot_doc else "",
                    endTime=slot_doc.get("endTime", "") if slot_doc else "",
                    slotOrder=slot_doc.get("slotOrder", 0) if slot_doc else 0,
                    resourceId=ent.get("resourceId"),
                    resourceName=res_doc.get("name") if res_doc else None,
                    scheduledFacultyIds=scheduled_fac_ids,
                    scheduledFacultyNames=fac_names,
                    effectiveFacultyId=eff_fac_id,
                    effectiveFacultyName=eff_fac_name,
                    isMultiFaculty=len(scheduled_fac_ids) > 1,
                    sessionStatus=session_status,
                    substitutionId=sub_id,
                    assignmentType=asg_type,
                    notes=notes,
                )
            )

        # Sort sessions by slotOrder and className
        sessions.sort(key=lambda s: (s.slotOrder, s.className))

        return DailyScheduleSummary(
            date=date_str,
            dayOfWeek=lookup.dayOfWeek,
            isTeachingDay=True,
            isException=lookup.isException,
            exceptionTitle=lookup.exceptionTitle,
            effectiveWorkingDayId=effective_wd_id,
            effectiveWorkingDayName=lookup.effectiveWorkingDayName,
            scheduledClassesCount=len(unique_classes),
            facultyOnLeaveCount=len(faculty_on_leave_list),
            substitutionsCount=substitutions_count,
            cancelledPeriodsCount=cancelled_count,
            unresolvedPeriodsCount=unresolved_count,
            facultyOnLeave=faculty_on_leave_list,
            sessions=sessions,
        )


substitution_service = SubstitutionService()
