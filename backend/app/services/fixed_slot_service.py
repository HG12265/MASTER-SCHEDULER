from typing import Any, Dict, List, Optional
from app.repositories.fixed_slot_repository import fixed_slot_repo
from app.repositories.academic_year_repository import academic_year_repo
from app.repositories.semester_type_repository import semester_type_repo
from app.repositories.class_repository import class_repo
from app.repositories.subject_repository import subject_repo
from app.repositories.faculty_repository import faculty_repo
from app.repositories.resource_repository import resource_repo
from app.repositories.working_day_repository import working_day_repo
from app.repositories.time_slot_repository import time_slot_repo
from app.repositories.faculty_availability_repository import faculty_availability_repo
from app.schemas.fixed_slot import FixedSlotCreate, FixedSlotUpdate
from app.utils.exceptions import BadRequestException, ConflictException, NotFoundException


class FixedSlotService:
    async def _validate_references_and_conflicts(
        self,
        academic_year_id: str,
        semester_type_id: str,
        class_id: str,
        working_day_id: str,
        time_slot_id: str,
        subject_id: Optional[str] = None,
        faculty_ids: Optional[List[str]] = None,
        resource_id: Optional[str] = None,
        exclude_id: Optional[str] = None,
    ) -> None:
        faculty_ids = faculty_ids or []

        # 1. Validate references
        ay = await academic_year_repo.get_by_id(academic_year_id)
        if not ay:
            raise NotFoundException(f"Academic year with ID '{academic_year_id}' not found")

        st = await semester_type_repo.get_by_id(semester_type_id)
        if not st:
            raise NotFoundException(f"Semester type with ID '{semester_type_id}' not found")

        cls_doc = await class_repo.get_by_id(class_id)
        if not cls_doc:
            raise NotFoundException(f"Class with ID '{class_id}' not found")

        wd = await working_day_repo.get_by_id(working_day_id)
        if not wd:
            raise NotFoundException(f"Working day with ID '{working_day_id}' not found")

        ts = await time_slot_repo.get_by_id(time_slot_id)
        if not ts:
            raise NotFoundException(f"Time slot with ID '{time_slot_id}' not found")
        if not ts.get("isTeachingSlot", True):
            raise BadRequestException(
                f"Time slot '{ts.get('name')}' is a break/lunch period; fixed classes cannot be scheduled"
            )

        if subject_id:
            subj = await subject_repo.get_by_id(subject_id)
            if not subj:
                raise NotFoundException(f"Subject with ID '{subject_id}' not found")
            if subj.get("programmeId") != cls_doc.get("programmeId"):
                raise BadRequestException(f"Subject '{subj.get('name')}' does not match class programme")

        for f_id in faculty_ids:
            fac = await faculty_repo.get_by_id(f_id)
            if not fac:
                raise NotFoundException(f"Faculty member with ID '{f_id}' not found")

        if resource_id:
            res = await resource_repo.get_by_id(resource_id)
            if not res:
                raise NotFoundException(f"Resource facility with ID '{resource_id}' not found")

        # 2. Check Class Conflict (Class cannot have 2 fixed slots at same time)
        existing_class_slot = await fixed_slot_repo.find_class_slot(
            academic_year_id,
            semester_type_id,
            class_id,
            working_day_id,
            time_slot_id,
            exclude_id=exclude_id,
        )
        if existing_class_slot:
            raise ConflictException(
                f"Class '{cls_doc.get('name')}' already has a fixed slot ({existing_class_slot.get('title') or existing_class_slot.get('slotCategory')}) scheduled on {wd.get('name')} at {ts.get('startTime')}-{ts.get('endTime')}"
            )

        # 3. Check Faculty Conflict (Faculty cannot be in two fixed slots simultaneously)
        for f_id in faculty_ids:
            fac_conflict = await fixed_slot_repo.find_faculty_conflict(
                academic_year_id,
                semester_type_id,
                f_id,
                working_day_id,
                time_slot_id,
                exclude_id=exclude_id,
            )
            if fac_conflict:
                fac = await faculty_repo.get_by_id(f_id)
                other_class = await class_repo.get_by_id(fac_conflict.get("classId"))
                raise ConflictException(
                    f"Faculty conflict: {fac.get('name')} is already assigned to a fixed slot in class '{other_class.get('name') if other_class else 'Another Class'}' on {wd.get('name')} at {ts.get('startTime')}-{ts.get('endTime')}"
                )

        # 4. Check Resource Conflict (Resource cannot be double-booked)
        if resource_id:
            res_conflict = await fixed_slot_repo.find_resource_conflict(
                academic_year_id,
                semester_type_id,
                resource_id,
                working_day_id,
                time_slot_id,
                exclude_id=exclude_id,
            )
            if res_conflict:
                res = await resource_repo.get_by_id(resource_id)
                other_class = await class_repo.get_by_id(res_conflict.get("classId"))
                raise ConflictException(
                    f"Resource conflict: Facility '{res.get('code')}' ({res.get('name')}) is already occupied by class '{other_class.get('name') if other_class else 'Another Class'}' on {wd.get('name')} at {ts.get('startTime')}-{ts.get('endTime')}"
                )

        # 5. Check Faculty Availability Conflict (Assigned faculty cannot be UNAVAILABLE)
        for f_id in faculty_ids:
            avail = await faculty_availability_repo.find_slot(
                academic_year_id,
                semester_type_id,
                f_id,
                working_day_id,
                time_slot_id,
            )
            if avail and avail.get("availabilityStatus") == "UNAVAILABLE" and avail.get("isActive", True):
                fac = await faculty_repo.get_by_id(f_id)
                reason_txt = f" (Reason: {avail.get('reason')})" if avail.get("reason") else ""
                raise ConflictException(
                    f"Faculty availability conflict: {fac.get('name')} is marked UNAVAILABLE on {wd.get('name')} at {ts.get('startTime')}-{ts.get('endTime')}{reason_txt}"
                )

    async def _enrich_doc(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        result = dict(doc)
        cls_doc = await class_repo.get_by_id(doc["classId"])
        if cls_doc:
            result["className"] = cls_doc.get("name")
            result["classDisplayName"] = cls_doc.get("displayName")

        wd = await working_day_repo.get_by_id(doc["workingDayId"])
        if wd:
            result["dayName"] = wd.get("name")
            result["dayOrder"] = wd.get("dayOrder")

        ts = await time_slot_repo.get_by_id(doc["timeSlotId"])
        if ts:
            result["timeSlotName"] = ts.get("name")
            result["startTime"] = ts.get("startTime")
            result["endTime"] = ts.get("endTime")
            result["slotOrder"] = ts.get("slotOrder")

        if doc.get("subjectId"):
            subj = await subject_repo.get_by_id(doc["subjectId"])
            if subj:
                result["subjectName"] = subj.get("name")
                result["subjectCode"] = subj.get("subjectCode")

        faculty_names = []
        for f_id in doc.get("facultyIds", []):
            fac = await faculty_repo.get_by_id(f_id)
            if fac:
                faculty_names.append(fac.get("name"))
        result["facultyNames"] = faculty_names

        if doc.get("resourceId"):
            res = await resource_repo.get_by_id(doc["resourceId"])
            if res:
                result["resourceName"] = res.get("name")
                result["resourceCode"] = res.get("code")

        return result

    async def create(self, data: FixedSlotCreate) -> Dict[str, Any]:
        await self._validate_references_and_conflicts(
            data.academicYearId,
            data.semesterTypeId,
            data.classId,
            data.workingDayId,
            data.timeSlotId,
            subject_id=data.subjectId,
            faculty_ids=data.facultyIds,
            resource_id=data.resourceId,
        )

        doc = await fixed_slot_repo.create(data.model_dump())
        return await self._enrich_doc(doc)

    async def get_by_id(self, id_str: str) -> Dict[str, Any]:
        doc = await fixed_slot_repo.get_by_id(id_str)
        if not doc:
            raise NotFoundException(f"Fixed timetable slot with ID '{id_str}' not found")
        return await self._enrich_doc(doc)

    async def list_fixed_slots(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        class_id: Optional[str] = None,
        faculty_id: Optional[str] = None,
        working_day_id: Optional[str] = None,
        slot_category: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 0,
    ) -> List[Dict[str, Any]]:
        docs = await fixed_slot_repo.search_fixed_slots(
            academic_year_id,
            semester_type_id,
            class_id,
            faculty_id,
            working_day_id,
            slot_category,
            is_active,
            skip,
            limit,
        )
        return [await self._enrich_doc(d) for d in docs]

    async def update(self, id_str: str, data: FixedSlotUpdate) -> Dict[str, Any]:
        existing = await fixed_slot_repo.get_by_id(id_str)
        if not existing:
            raise NotFoundException(f"Fixed timetable slot with ID '{id_str}' not found")

        # Merge fields for conflict validation
        new_data = data.model_dump(exclude_unset=True)
        merged_subject_id = new_data.get("subjectId", existing.get("subjectId"))
        merged_faculty_ids = new_data.get("facultyIds", existing.get("facultyIds", []))
        merged_resource_id = new_data.get("resourceId", existing.get("resourceId"))

        await self._validate_references_and_conflicts(
            existing["academicYearId"],
            existing["semesterTypeId"],
            existing["classId"],
            existing["workingDayId"],
            existing["timeSlotId"],
            subject_id=merged_subject_id,
            faculty_ids=merged_faculty_ids,
            resource_id=merged_resource_id,
            exclude_id=id_str,
        )

        update_fields = {k: v for k, v in new_data.items() if v is not None}
        doc = await fixed_slot_repo.update_by_id(id_str, update_fields)
        return await self._enrich_doc(doc)

    async def delete(self, id_str: str) -> bool:
        if not await fixed_slot_repo.get_by_id(id_str):
            raise NotFoundException(f"Fixed timetable slot with ID '{id_str}' not found")
        return await fixed_slot_repo.delete_by_id(id_str)


fixed_slot_service = FixedSlotService()
