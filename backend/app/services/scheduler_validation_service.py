from collections import defaultdict
from typing import Any, Dict, List, Optional
from app.repositories.academic_year_repository import academic_year_repo
from app.repositories.semester_type_repository import semester_type_repo
from app.repositories.working_day_repository import working_day_repo
from app.repositories.time_slot_repository import time_slot_repo
from app.repositories.class_repository import class_repo
from app.repositories.subject_repository import subject_repo
from app.repositories.faculty_repository import faculty_repo
from app.repositories.resource_repository import resource_repo
from app.repositories.faculty_allocation_repository import faculty_allocation_repo
from app.repositories.fixed_slot_repository import fixed_slot_repo
from app.repositories.faculty_availability_repository import faculty_availability_repo
from app.schemas.scheduler_validation import (
    SchedulerValidationIssue,
    SchedulerValidationResult,
    SchedulerValidationSummary,
    SchedulerReadinessResponse,
    ValidationSeverity,
)
from app.utils.exceptions import NotFoundException


class SchedulerValidationService:
    async def validate_term(
        self, academic_year_id: str, semester_type_id: str
    ) -> SchedulerValidationResult:
        ay = await academic_year_repo.get_by_id(academic_year_id)
        if not ay:
            raise NotFoundException(f"Academic year with ID '{academic_year_id}' not found")

        st = await semester_type_repo.get_by_id(semester_type_id)
        if not st:
            raise NotFoundException(f"Semester type with ID '{semester_type_id}' not found")

        issues: List[SchedulerValidationIssue] = []

        # Fetch all baseline master data
        working_days = await working_day_repo.find_many({"isActive": True})
        active_working_days = [d for d in working_days if d.get("isWorkingDay", True)]

        time_slots = await time_slot_repo.find_many({"isActive": True})
        teaching_slots = [t for t in time_slots if t.get("isTeachingSlot", True)]
        teaching_slots.sort(key=lambda x: x.get("slotOrder", 0))

        classes = await class_repo.find_many({
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
            "isActive": True,
        })

        allocations = await faculty_allocation_repo.find_many({
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
            "isActive": True,
        })

        fixed_slots = await fixed_slot_repo.find_many({
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
            "isActive": True,
        })

        all_faculty = await faculty_repo.find_many({"isActive": True})
        faculty_map = {f["id"]: f for f in all_faculty}

        all_subjects = await subject_repo.find_many({"isActive": True})
        subject_map = {s["id"]: s for s in all_subjects}

        class_map = {c["id"]: c for c in classes}
        day_map = {d["id"]: d for d in working_days}
        slot_map = {t["id"]: t for t in time_slots}

        # 1. At least one active class
        if not classes:
            issues.append(
                SchedulerValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="NO_ACTIVE_CLASSES",
                    message=f"No active classes configured for academic year '{ay.get('name')}' and term '{st.get('name')}'.",
                    entityType="CLASS",
                )
            )

        # 2. Working days exist
        if not active_working_days:
            issues.append(
                SchedulerValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="NO_WORKING_DAYS",
                    message="No active teaching working days configured (e.g. Monday-Friday).",
                    entityType="WORKING_DAY",
                )
            )

        # 3. Teaching time slots exist
        if not teaching_slots:
            issues.append(
                SchedulerValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="NO_TEACHING_SLOTS",
                    message="No active teaching periods/time slots configured.",
                    entityType="TIME_SLOT",
                )
            )

        total_weekly_slots_per_class = len(active_working_days) * len(teaching_slots)

        if total_weekly_slots_per_class > 0:
            issues.append(
                SchedulerValidationIssue(
                    severity=ValidationSeverity.INFO,
                    code="SCHEDULE_CAPACITY_INFO",
                    message=f"Total schedule capacity per cohort: {len(active_working_days)} days × {len(teaching_slots)} periods = {total_weekly_slots_per_class} slots/week.",
                )
            )

        # 4 & 5. Allocations per class check
        class_alloc_map = defaultdict(list)
        for a in allocations:
            class_alloc_map[a["classId"]].append(a)

        for c in classes:
            c_allocs = class_alloc_map.get(c["id"], [])
            if not c_allocs:
                issues.append(
                    SchedulerValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="CLASS_WITHOUT_ALLOCATIONS",
                        message=f"Class '{c.get('name')}' ({c.get('displayName')}) has no courses or faculty allocated.",
                        entityType="CLASS",
                        entityId=c["id"],
                    )
                )
            else:
                # 16. Total required class periods vs available capacity
                total_class_hours = sum(a.get("weeklyHours", 0) for a in c_allocs)
                if total_weekly_slots_per_class > 0 and total_class_hours > total_weekly_slots_per_class:
                    issues.append(
                        SchedulerValidationIssue(
                            severity=ValidationSeverity.ERROR,
                            code="CLASS_CAPACITY_EXCEEDED",
                            message=f"Class '{c.get('name')}' requires {total_class_hours} periods/week, which exceeds the total weekly capacity of {total_weekly_slots_per_class} slots.",
                            entityType="CLASS",
                            entityId=c["id"],
                            details={"required": total_class_hours, "capacity": total_weekly_slots_per_class},
                        )
                    )

        # 6, 7, 8, 14. Allocation inspection
        faculty_workload_hours = defaultdict(int)

        for a in allocations:
            c_id = a.get("classId")
            cls_doc = class_map.get(c_id)
            s_id = a.get("subjectId")
            subj_doc = subject_map.get(s_id)
            fac_ids = a.get("facultyIds", [])

            if not fac_ids:
                issues.append(
                    SchedulerValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="ALLOCATION_WITHOUT_FACULTY",
                        message=f"Course allocation for class '{cls_doc.get('name') if cls_doc else c_id}' has no assigned faculty member.",
                        entityType="FACULTY_ALLOCATION",
                        entityId=a["id"],
                    )
                )

            hours = a.get("weeklyHours", 0)
            if hours <= 0:
                issues.append(
                    SchedulerValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="INVALID_WEEKLY_HOURS",
                        message=f"Allocation for '{subj_doc.get('name') if subj_doc else s_id}' has invalid weekly hours ({hours}).",
                        entityType="FACULTY_ALLOCATION",
                        entityId=a["id"],
                    )
                )

            # Block size check
            block = a.get("blockSize", 1)
            if block > len(teaching_slots) and len(teaching_slots) > 0:
                issues.append(
                    SchedulerValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="BLOCK_SIZE_EXCEEDS_SLOTS",
                        message=f"Subject '{subj_doc.get('name') if subj_doc else s_id}' requires a session block size of {block}, but only {len(teaching_slots)} daily teaching periods exist.",
                        entityType="SUBJECT",
                        entityId=s_id,
                    )
                )

            # 14. Subject programme & semester match check
            if cls_doc and subj_doc:
                if subj_doc.get("programmeId") != cls_doc.get("programmeId"):
                    issues.append(
                        SchedulerValidationIssue(
                            severity=ValidationSeverity.ERROR,
                            code="SUBJECT_PROGRAMME_MISMATCH",
                            message=f"Subject '{subj_doc.get('name')}' belongs to a different programme than class '{cls_doc.get('name')}'.",
                            entityType="SUBJECT",
                            entityId=s_id,
                        )
                    )

            # Track workload per faculty
            for fid in fac_ids:
                faculty_workload_hours[fid] += hours

        # 9 & 17. Faculty workload limits check
        for fid, alloc_hours in faculty_workload_hours.items():
            fac = faculty_map.get(fid)
            if fac:
                max_allowed = fac.get("maxHoursPerWeek", 16)
                if alloc_hours > max_allowed:
                    issues.append(
                        SchedulerValidationIssue(
                            severity=ValidationSeverity.ERROR,
                            code="FACULTY_OVERLOAD",
                            message=f"{fac.get('name')} ({fac.get('facultyCode')}) has {alloc_hours} allocated hours, exceeding maximum weekly workload limit of {max_allowed} hrs.",
                            entityType="FACULTY",
                            entityId=fid,
                            details={"allocated": alloc_hours, "maxAllowed": max_allowed},
                        )
                    )
                elif alloc_hours == 0:
                    issues.append(
                        SchedulerValidationIssue(
                            severity=ValidationSeverity.WARNING,
                            code="FACULTY_ZERO_HOURS",
                            message=f"{fac.get('name')} ({fac.get('facultyCode')}) has 0 teaching hours allocated in this term.",
                            entityType="FACULTY",
                            entityId=fid,
                        )
                    )

        # 10, 11, 12, 13. Fixed slots validation & conflicts
        class_fixed_seen = set()
        faculty_fixed_seen = defaultdict(list)
        resource_fixed_seen = defaultdict(list)

        for fs in fixed_slots:
            slot_key = (fs["workingDayId"], fs["timeSlotId"])
            cls_key = (fs["classId"],) + slot_key

            ts_doc = slot_map.get(fs["timeSlotId"])
            day_doc = day_map.get(fs["workingDayId"])
            c_doc = class_map.get(fs["classId"])

            # Check non-teaching slot
            if ts_doc and not ts_doc.get("isTeachingSlot", True):
                issues.append(
                    SchedulerValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="FIXED_SLOT_NON_TEACHING",
                        message=f"Fixed slot '{fs.get('title')}' is scheduled during break/lunch period '{ts_doc.get('name')}'.",
                        entityType="FIXED_SLOT",
                        entityId=fs["id"],
                    )
                )

            # 12. Class fixed slot conflict
            if cls_key in class_fixed_seen:
                issues.append(
                    SchedulerValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="CLASS_FIXED_SLOT_CONFLICT",
                        message=f"Class '{c_doc.get('name') if c_doc else fs['classId']}' has multiple fixed slots scheduled simultaneously on {day_doc.get('name') if day_doc else ''} at {ts_doc.get('startTime') if ts_doc else ''}.",
                        entityType="FIXED_SLOT",
                        entityId=fs["id"],
                    )
                )
            class_fixed_seen.add(cls_key)

            # 10 & 11. Faculty fixed conflicts & availability
            for fid in fs.get("facultyIds", []):
                fac = faculty_map.get(fid)
                fac_key = (fid,) + slot_key
                faculty_fixed_seen[fac_key].append(fs)

                # Check if faculty is UNAVAILABLE in this slot
                avail = await faculty_availability_repo.find_slot(
                    academic_year_id,
                    semester_type_id,
                    fid,
                    fs["workingDayId"],
                    fs["timeSlotId"],
                )
                if avail and avail.get("availabilityStatus") == "UNAVAILABLE" and avail.get("isActive", True):
                    issues.append(
                        SchedulerValidationIssue(
                            severity=ValidationSeverity.ERROR,
                            code="FIXED_SLOT_FACULTY_UNAVAILABLE",
                            message=f"{fac.get('name') if fac else fid} is marked UNAVAILABLE on {day_doc.get('name') if day_doc else ''} at {ts_doc.get('startTime') if ts_doc else ''}, but assigned to fixed slot '{fs.get('title')}'.",
                            entityType="FIXED_SLOT",
                            entityId=fs["id"],
                        )
                    )

            # 13. Resource double booking
            res_id = fs.get("resourceId")
            if res_id:
                res_key = (res_id,) + slot_key
                resource_fixed_seen[res_key].append(fs)

        # Report faculty simultaneous fixed assignments
        for fac_key, fs_list in faculty_fixed_seen.items():
            if len(fs_list) > 1:
                fid = fac_key[0]
                fac = faculty_map.get(fid)
                issues.append(
                    SchedulerValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="FACULTY_FIXED_SLOT_CLASH",
                        message=f"{fac.get('name') if fac else fid} is assigned to {len(fs_list)} overlapping fixed slots simultaneously.",
                        entityType="FACULTY",
                        entityId=fid,
                    )
                )

        # Report resource simultaneous assignments
        for res_key, fs_list in resource_fixed_seen.items():
            if len(fs_list) > 1:
                rid = res_key[0]
                res = await resource_repo.get_by_id(rid)
                issues.append(
                    SchedulerValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="RESOURCE_FIXED_SLOT_CLASH",
                        message=f"Facility '{res.get('code') if res else rid}' is booked by {len(fs_list)} classes at the same time.",
                        entityType="RESOURCE",
                        entityId=rid,
                    )
                )

        # 18. Consecutive lab block feasibility check
        # Verify if any active subject with requiresConsecutivePeriods can be accommodated
        max_consecutive_teaching_slots = len(teaching_slots)
        for s in all_subjects:
            if s.get("requiresConsecutivePeriods") and s.get("defaultBlockSize", 1) > max_consecutive_teaching_slots:
                issues.append(
                    SchedulerValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="LAB_BLOCK_INFEASIBLE",
                        message=f"Lab subject '{s.get('name')}' requires {s.get('defaultBlockSize')} consecutive periods, but maximum consecutive daily slots is {max_consecutive_teaching_slots}.",
                        entityType="SUBJECT",
                        entityId=s["id"],
                    )
                )

        # Summary count
        err_count = sum(1 for i in issues if i.severity == ValidationSeverity.ERROR)
        warn_count = sum(1 for i in issues if i.severity == ValidationSeverity.WARNING)
        info_count = sum(1 for i in issues if i.severity == ValidationSeverity.INFO)

        is_ready = (
            err_count == 0
            and len(classes) > 0
            and len(active_working_days) > 0
            and len(teaching_slots) > 0
            and len(allocations) > 0
        )

        return SchedulerValidationResult(
            ready=is_ready,
            summary=SchedulerValidationSummary(
                errors=err_count,
                warnings=warn_count,
                info=info_count,
            ),
            issues=issues,
        )

    async def get_readiness(
        self, academic_year_id: str, semester_type_id: str
    ) -> SchedulerReadinessResponse:
        ay = await academic_year_repo.get_by_id(academic_year_id)
        if not ay:
            raise NotFoundException(f"Academic year with ID '{academic_year_id}' not found")

        st = await semester_type_repo.get_by_id(semester_type_id)
        if not st:
            raise NotFoundException(f"Semester type with ID '{semester_type_id}' not found")

        classes_count = await class_repo.count({
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
            "isActive": True,
        })
        faculty_count = await faculty_repo.count({"isActive": True})
        subjects_count = await subject_repo.count({"isActive": True})
        allocs = await faculty_allocation_repo.find_many({
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
            "isActive": True,
        })
        fixed_count = await fixed_slot_repo.count_fixed_slots(
            academic_year_id=academic_year_id,
            semester_type_id=semester_type_id,
            is_active=True,
        )
        unavail_count = await faculty_availability_repo.count_availability(
            academic_year_id=academic_year_id,
            semester_type_id=semester_type_id,
            availability_status="UNAVAILABLE",
            is_active=True,
        )

        working_days = await working_day_repo.find_many({"isActive": True, "isWorkingDay": True})
        time_slots = await time_slot_repo.find_many({"isActive": True, "isTeachingSlot": True})
        total_teaching_slots = len(working_days) * len(time_slots)

        total_req_periods = sum(a.get("weeklyHours", 0) for a in allocs)

        # Run validation
        val_res = await self.validate_term(academic_year_id, semester_type_id)

        return SchedulerReadinessResponse(
            academicYearId=academic_year_id,
            academicYearName=ay.get("name", ""),
            semesterTypeId=semester_type_id,
            semesterTypeName=st.get("name", ""),
            classes=classes_count,
            faculty=faculty_count,
            subjects=subjects_count,
            allocations=len(allocs),
            fixedSlots=fixed_count,
            unavailableFacultySlots=unavail_count,
            totalTeachingSlots=total_teaching_slots,
            totalRequiredPeriods=total_req_periods,
            validationErrors=val_res.summary.errors,
            validationWarnings=val_res.summary.warnings,
            ready=val_res.ready,
        )


scheduler_validation_service = SchedulerValidationService()
