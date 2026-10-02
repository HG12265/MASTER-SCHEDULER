from datetime import datetime, date, timedelta, timezone
from typing import List, Optional, Dict, Any
from app.repositories.leave_request_repository import leave_request_repository
from app.repositories.faculty_repository import faculty_repository
from app.repositories.timetable_repository import timetable_repository
from app.repositories.class_repository import class_repository
from app.repositories.subject_repository import subject_repository
from app.repositories.time_slot_repository import time_slot_repository
from app.repositories.working_day_repository import working_day_repository
from app.repositories.resource_repository import resource_repository
from app.schemas.leave_request import (
    LeaveRequestCreate,
    LeaveRequestResponse,
    LeaveImpactResponse,
    AffectedPeriodItem,
    LeaveStatus,
)
from app.services.academic_calendar_service import academic_calendar_service
from app.services.notification_service import notification_service
from app.services.audit_service import audit_service
from app.utils.exceptions import NotFoundException, BadRequestException, ConflictException
from app.utils.logger import get_logger

logger = get_logger(__name__)


def daterange(start_date: date, end_date: date):
    for n in range(int((end_date - start_date).days) + 1):
        yield start_date + timedelta(n)


class LeaveRequestService:
    def __init__(self):
        self.repo = leave_request_repository

    async def _format_leave(self, doc: Dict[str, Any]) -> LeaveRequestResponse:
        fac = None
        if doc.get("facultyId"):
            fac = await faculty_repository.get_by_id(doc["facultyId"])

        return LeaveRequestResponse(
            id=str(doc.get("id") or doc.get("_id")),
            facultyId=str(doc.get("facultyId", "")),
            facultyName=fac.get("name") if fac else None,
            facultyCode=fac.get("facultyCode") if fac else None,
            department=fac.get("department") if fac else None,
            leaveType=str(doc.get("leaveType", "CASUAL")),
            startDate=str(doc.get("startDate", "")),
            endDate=str(doc.get("endDate", "")),
            fullDay=bool(doc.get("fullDay", True)),
            affectedTimeSlotIds=doc.get("affectedTimeSlotIds", []),
            reason=str(doc.get("reason", "")),
            status=str(doc.get("status", "PENDING")),
            requestedAt=doc.get("requestedAt").isoformat() if isinstance(doc.get("requestedAt"), datetime) else str(doc.get("requestedAt")) if doc.get("requestedAt") else None,
            reviewedAt=doc.get("reviewedAt").isoformat() if isinstance(doc.get("reviewedAt"), datetime) else str(doc.get("reviewedAt")) if doc.get("reviewedAt") else None,
            reviewedBy=doc.get("reviewedBy"),
            reviewNotes=doc.get("reviewNotes"),
            affectedPeriodsCount=doc.get("affectedPeriodsCount"),
            isActive=bool(doc.get("isActive", True)),
            createdAt=doc.get("createdAt").isoformat() if isinstance(doc.get("createdAt"), datetime) else str(doc.get("createdAt")) if doc.get("createdAt") else None,
            updatedAt=doc.get("updatedAt").isoformat() if isinstance(doc.get("updatedAt"), datetime) else str(doc.get("updatedAt")) if doc.get("updatedAt") else None,
        )

    async def list_leave_requests(
        self,
        faculty_id: Optional[str] = None,
        status_filter: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[LeaveRequestResponse]:
        query: Dict[str, Any] = {}
        if faculty_id:
            query["facultyId"] = faculty_id
        if status_filter:
            query["status"] = status_filter
        if start_date or end_date:
            date_filter: Dict[str, Any] = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            query["startDate"] = date_filter

        docs = await self.repo.find_many(query, sort=[("startDate", -1), ("createdAt", -1)])
        return [await self._format_leave(d) for d in docs]

    async def get_by_id(self, leave_id: str) -> LeaveRequestResponse:
        doc = await self.repo.get_by_id(leave_id)
        if not doc:
            raise NotFoundException("LeaveRequest", leave_id)
        return await self._format_leave(doc)

    async def create_leave_request(self, payload: LeaveRequestCreate, current_user: Optional[Dict[str, Any]] = None) -> LeaveRequestResponse:
        # Verify faculty exists
        fac = await faculty_repository.get_by_id(payload.facultyId)
        if not fac:
            raise NotFoundException("Faculty", payload.facultyId)

        try:
            s_date = datetime.strptime(payload.startDate, "%Y-%m-%d").date()
            e_date = datetime.strptime(payload.endDate, "%Y-%m-%d").date()
        except ValueError:
            raise BadRequestException("Dates must be formatted as YYYY-MM-DD")

        if e_date < s_date:
            raise BadRequestException("End date cannot be earlier than start date")

        # Calculate affected periods count beforehand
        impact = await self.calculate_impact(
            faculty_id=payload.facultyId,
            start_date_str=payload.startDate,
            end_date_str=payload.endDate,
            full_day=payload.fullDay,
            affected_slot_ids=payload.affectedTimeSlotIds,
        )

        data = {
            "facultyId": payload.facultyId,
            "leaveType": payload.leaveType.value if hasattr(payload.leaveType, "value") else str(payload.leaveType),
            "startDate": payload.startDate,
            "endDate": payload.endDate,
            "fullDay": payload.fullDay,
            "affectedTimeSlotIds": payload.affectedTimeSlotIds or [],
            "reason": payload.reason.strip(),
            "status": LeaveStatus.PENDING.value,
            "requestedAt": datetime.now(timezone.utc),
            "reviewedAt": None,
            "reviewedBy": None,
            "reviewNotes": None,
            "affectedPeriodsCount": impact.totalAffectedPeriods,
            "isActive": True,
        }

        created = await self.repo.create(data)

        # Notify admins of new leave request
        await notification_service.notify_all_admins(
            notif_type="LEAVE_REQUESTED",
            title="New Faculty Leave Request",
            message=f"{fac.get('name')} submitted a {data['leaveType']} leave request for {payload.startDate} to {payload.endDate} ({impact.totalAffectedPeriods} affected periods).",
            related_entity_type="LeaveRequest",
            related_entity_id=str(created["id"]),
        )

        # Log audit entry
        await audit_service.log_action(
            action="LEAVE_REQUESTED",
            entity_type="LeaveRequest",
            entity_id=str(created["id"]),
            description=f"Leave request created for {fac.get('name')} ({payload.startDate} to {payload.endDate})",
            user=current_user,
            metadata={"facultyId": payload.facultyId, "leaveType": data["leaveType"], "affectedPeriods": impact.totalAffectedPeriods},
        )

        return await self._format_leave(created)

    async def approve_leave_request(
        self,
        leave_id: str,
        review_notes: Optional[str] = None,
        current_user: Optional[Dict[str, Any]] = None,
    ) -> LeaveRequestResponse:
        doc = await self.repo.get_by_id(leave_id)
        if not doc:
            raise NotFoundException("LeaveRequest", leave_id)

        if doc.get("status") == LeaveStatus.APPROVED.value:
            raise ConflictException("This leave request is already approved")

        now = datetime.now(timezone.utc)
        reviewer_name = current_user.get("username") if current_user else "ADMIN"

        updated = await self.repo.update_by_id(leave_id, {
            "status": LeaveStatus.APPROVED.value,
            "reviewedAt": now,
            "reviewedBy": reviewer_name,
            "reviewNotes": review_notes,
        })

        fac = await faculty_repository.get_by_id(doc["facultyId"])
        fac_name = fac.get("name") if fac else "Faculty"

        # In-app notification to the faculty member
        await notification_service.notify_faculty(
            faculty_id=doc["facultyId"],
            notif_type="LEAVE_APPROVED",
            title="Leave Request Approved",
            message=f"Your leave request for {doc['startDate']} to {doc['endDate']} has been approved by {reviewer_name}.",
            related_entity_type="LeaveRequest",
            related_entity_id=leave_id,
        )

        # Log audit
        await audit_service.log_action(
            action="LEAVE_APPROVED",
            entity_type="LeaveRequest",
            entity_id=leave_id,
            description=f"Leave request approved for {fac_name} ({doc['startDate']} to {doc['endDate']})",
            user=current_user,
            metadata={"facultyId": doc["facultyId"], "reviewNotes": review_notes},
        )

        return await self._format_leave(updated)

    async def reject_leave_request(
        self,
        leave_id: str,
        review_notes: Optional[str] = None,
        current_user: Optional[Dict[str, Any]] = None,
    ) -> LeaveRequestResponse:
        doc = await self.repo.get_by_id(leave_id)
        if not doc:
            raise NotFoundException("LeaveRequest", leave_id)

        now = datetime.now(timezone.utc)
        reviewer_name = current_user.get("username") if current_user else "ADMIN"

        updated = await self.repo.update_by_id(leave_id, {
            "status": LeaveStatus.REJECTED.value,
            "reviewedAt": now,
            "reviewedBy": reviewer_name,
            "reviewNotes": review_notes,
        })

        fac = await faculty_repository.get_by_id(doc["facultyId"])
        fac_name = fac.get("name") if fac else "Faculty"

        await notification_service.notify_faculty(
            faculty_id=doc["facultyId"],
            notif_type="LEAVE_REJECTED",
            title="Leave Request Not Approved",
            message=f"Your leave request for {doc['startDate']} to {doc['endDate']} was rejected. Notes: {review_notes or 'None'}",
            related_entity_type="LeaveRequest",
            related_entity_id=leave_id,
        )

        await audit_service.log_action(
            action="LEAVE_REJECTED",
            entity_type="LeaveRequest",
            entity_id=leave_id,
            description=f"Leave request rejected for {fac_name}",
            user=current_user,
            metadata={"facultyId": doc["facultyId"], "reviewNotes": review_notes},
        )

        return await self._format_leave(updated)

    async def cancel_leave_request(
        self,
        leave_id: str,
        current_user: Optional[Dict[str, Any]] = None,
    ) -> LeaveRequestResponse:
        doc = await self.repo.get_by_id(leave_id)
        if not doc:
            raise NotFoundException("LeaveRequest", leave_id)

        now = datetime.now(timezone.utc)
        canceller_name = current_user.get("username") if current_user else "USER"

        updated = await self.repo.update_by_id(leave_id, {
            "status": LeaveStatus.CANCELLED.value,
            "reviewedAt": now,
            "reviewedBy": canceller_name,
            "reviewNotes": "Cancelled by user or administrator",
        })

        # Cancel any active substitutions linked to this leave period for this faculty
        from app.repositories.base_repository import BaseRepository
        sub_repo = BaseRepository("substitutions")
        await sub_repo.collection.update_many(
            {
                "absentFacultyId": doc["facultyId"],
                "date": {"$gte": doc["startDate"], "$lte": doc["endDate"]},
                "status": "ASSIGNED",
            },
            {"$set": {"status": "CANCELLED", "updatedAt": now}},
        )

        await audit_service.log_action(
            action="LEAVE_CANCELLED",
            entity_type="LeaveRequest",
            entity_id=leave_id,
            description=f"Leave request cancelled for faculty {doc['facultyId']}",
            user=current_user,
        )

        return await self._format_leave(updated)

    async def calculate_impact(
        self,
        faculty_id: str,
        start_date_str: str,
        end_date_str: str,
        full_day: bool = True,
        affected_slot_ids: Optional[List[str]] = None,
        leave_request_id: Optional[str] = None,
    ) -> LeaveImpactResponse:
        fac = await faculty_repository.get_by_id(faculty_id)
        if not fac:
            raise NotFoundException("Faculty", faculty_id)

        s_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        e_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()

        # Find all PUBLISHED timetables
        published_timetables = await timetable_repository.find_many({"status": "PUBLISHED"})

        affected_periods: List[AffectedPeriodItem] = []
        teaching_days_count = 0

        # Preload lookups for performance
        from app.repositories.base_repository import BaseRepository
        entry_repo = BaseRepository("timetable_entries")
        sub_repo = BaseRepository("substitutions")

        for curr_date in daterange(s_date, e_date):
            date_str = curr_date.strftime("%Y-%m-%d")
            lookup = await academic_calendar_service.resolve_date(date_str)

            if not lookup.isTeachingDay or not lookup.effectiveWorkingDayId:
                continue

            teaching_days_count += 1
            effective_wd_id = lookup.effectiveWorkingDayId

            # For each published timetable, query entries for this faculty on this effective working day
            for tt in published_timetables:
                tt_id = str(tt.get("id") or tt.get("_id"))
                query = {
                    "timetableId": tt_id,
                    "workingDayId": effective_wd_id,
                    "facultyIds": faculty_id,
                    "isActive": True,
                }
                if not full_day and affected_slot_ids:
                    query["timeSlotId"] = {"$in": affected_slot_ids}

                entries = await entry_repo.find_many(query)

                for ent in entries:
                    ent_id = str(ent.get("id") or ent.get("_id"))

                    # Fetch related master data names
                    cls_doc = await class_repository.get_by_id(ent.get("classId", ""))
                    sub_doc = await subject_repository.get_by_id(ent.get("subjectId", ""))
                    slot_doc = await time_slot_repository.get_by_id(ent.get("timeSlotId", ""))
                    res_doc = await resource_repository.get_by_id(ent.get("resourceId", "")) if ent.get("resourceId") else None
                    wd_doc = await working_day_repository.get_by_id(effective_wd_id)

                    # Multi-faculty check
                    all_fac_ids = ent.get("facultyIds", [])
                    co_fac_ids = [fid for fid in all_fac_ids if fid != faculty_id]
                    co_fac_names = []
                    for cid in co_fac_ids:
                        cf = await faculty_repository.get_by_id(cid)
                        if cf:
                            co_fac_names.append(cf.get("name", "Faculty"))

                    # Check substitution record for this date and entry
                    sub_record = await sub_repo.find_one({
                        "date": date_str,
                        "originalEntryId": ent_id,
                        "status": {"$in": ["ASSIGNED", "PROPOSED"]},
                    })
                    sub_status = sub_record.get("status") if sub_record else None
                    sub_fac_id = sub_record.get("substituteFacultyId") if sub_record else None
                    sub_fac_name = None
                    if sub_fac_id:
                        sf = await faculty_repository.get_by_id(sub_fac_id)
                        if sf:
                            sub_fac_name = sf.get("name")

                    affected_periods.append(
                        AffectedPeriodItem(
                            date=date_str,
                            entryId=ent_id,
                            timetableId=tt_id,
                            classId=ent.get("classId", ""),
                            className=cls_doc.get("name", "Class") if cls_doc else ent.get("className", "Class"),
                            subjectId=ent.get("subjectId", ""),
                            subjectName=sub_doc.get("name", "Subject") if sub_doc else ent.get("subjectName", "Subject"),
                            subjectCode=sub_doc.get("subjectCode", "") if sub_doc else ent.get("subjectCode", ""),
                            timeSlotId=ent.get("timeSlotId", ""),
                            timeSlotName=slot_doc.get("name", "Period") if slot_doc else ent.get("timeSlotName", "Period"),
                            startTime=slot_doc.get("startTime", "") if slot_doc else ent.get("startTime", ""),
                            endTime=slot_doc.get("endTime", "") if slot_doc else ent.get("endTime", ""),
                            slotOrder=slot_doc.get("slotOrder", 0) if slot_doc else ent.get("slotOrder", 0),
                            workingDayId=effective_wd_id,
                            workingDayName=wd_doc.get("name", lookup.effectiveWorkingDayName or "Working Day") if wd_doc else "Working Day",
                            resourceId=ent.get("resourceId"),
                            resourceName=res_doc.get("name") if res_doc else ent.get("resourceName"),
                            coFacultyIds=co_fac_ids,
                            coFacultyNames=co_fac_names,
                            isMultiFaculty=len(all_fac_ids) > 1,
                            substitutionStatus=sub_status,
                            substituteFacultyId=sub_fac_id,
                            substituteFacultyName=sub_fac_name,
                        )
                    )

        # Sort affected periods by date then slotOrder
        affected_periods.sort(key=lambda p: (p.date, p.slotOrder))

        return LeaveImpactResponse(
            leaveRequestId=leave_request_id,
            facultyId=faculty_id,
            facultyName=fac.get("name", ""),
            facultyCode=fac.get("facultyCode", ""),
            startDate=start_date_str,
            endDate=end_date_str,
            totalTeachingDays=teaching_days_count,
            totalAffectedPeriods=len(affected_periods),
            affectedPeriods=affected_periods,
        )

    async def get_leave_impact(self, leave_id: str) -> LeaveImpactResponse:
        doc = await self.repo.get_by_id(leave_id)
        if not doc:
            raise NotFoundException("LeaveRequest", leave_id)

        return await self.calculate_impact(
            faculty_id=doc["facultyId"],
            start_date_str=doc["startDate"],
            end_date_str=doc["endDate"],
            full_day=doc.get("fullDay", True),
            affected_slot_ids=doc.get("affectedTimeSlotIds", []),
            leave_request_id=leave_id,
        )


leave_request_service = LeaveRequestService()
