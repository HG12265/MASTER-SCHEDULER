from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple
from app.repositories.academic_year_repository import academic_year_repo
from app.repositories.class_repository import class_repo
from app.repositories.faculty_allocation_repository import faculty_allocation_repo
from app.repositories.faculty_constraint_repository import faculty_constraint_repo
from app.repositories.faculty_repository import faculty_repo
from app.repositories.resource_repository import resource_repo
from app.repositories.semester_type_repository import semester_type_repo
from app.repositories.subject_repository import subject_repo
from app.repositories.time_slot_repository import time_slot_repo
from app.repositories.timetable_repository import timetable_entry_repo, timetable_repo
from app.repositories.working_day_repository import working_day_repo
from app.schemas.reports import (
    ClassLoadItem,
    ClassLoadReport,
    FacultyWorkloadItem,
    FacultyWorkloadReport,
    ResourceUtilizationItem,
    ResourceUtilizationReport,
    SubjectCoverageItem,
    SubjectCoverageReport,
)
from app.utils.exceptions import NotFoundException


class ReportService:
    async def _resolve_timetable(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        timetable_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        if timetable_id:
            tt = await timetable_repo.get_by_id(timetable_id)
            if not tt:
                raise NotFoundException(f"Timetable with ID '{timetable_id}' not found")
            return tt

        query: Dict[str, Any] = {}
        if academic_year_id:
            query["academicYearId"] = academic_year_id
        if semester_type_id:
            query["semesterTypeId"] = semester_type_id

        # First try finding published
        pub_query = dict(query)
        pub_query["status"] = "PUBLISHED"
        published_tts = await timetable_repo.find_many(pub_query, sort=[("version", -1)], limit=1)
        if published_tts:
            return published_tts[0]

        # Then ready for approval
        app_query = dict(query)
        app_query["status"] = "READY_FOR_APPROVAL"
        app_tts = await timetable_repo.find_many(app_query, sort=[("version", -1)], limit=1)
        if app_tts:
            return app_tts[0]

        # Then any draft
        all_tts = await timetable_repo.find_many(query, sort=[("version", -1)], limit=1)
        if all_tts:
            return all_tts[0]

        return None

    async def get_faculty_workload_report(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        timetable_id: Optional[str] = None,
        faculty_id: Optional[str] = None,
    ) -> FacultyWorkloadReport:
        tt = await self._resolve_timetable(academic_year_id, semester_type_id, timetable_id)
        tt_id = tt["id"] if tt else None

        fac_query = {"isActive": True}
        if faculty_id:
            from app.utils.object_id import parse_object_id
            fac_query["_id"] = parse_object_id(faculty_id)

        all_faculty = await faculty_repo.find_many(fac_query, sort=[("name", 1)])
        all_subjects = await subject_repo.find_many({"isActive": True})
        subj_map = {s["id"]: s for s in all_subjects}
        all_classes = await class_repo.find_many({"isActive": True})
        cls_map = {c["id"]: c for c in all_classes}

        # Load constraints
        all_constraints = await faculty_constraint_repo.find_many({})
        constraint_map = {c["facultyId"]: c for c in all_constraints}

        # Load allocations for term
        alloc_query = {"isActive": True}
        if tt:
            alloc_query["academicYearId"] = tt["academicYearId"]
            alloc_query["semesterTypeId"] = tt["semesterTypeId"]
        all_allocs = await faculty_allocation_repo.find_many(alloc_query)

        # Faculty required hours map from allocations
        required_hours_map: Dict[str, int] = defaultdict(int)
        alloc_subjects_map: Dict[str, Set[str]] = defaultdict(set)
        alloc_classes_map: Dict[str, Set[str]] = defaultdict(set)
        for a in all_allocs:
            for fid in a.get("facultyIds", []):
                required_hours_map[fid] += int(a.get("weeklyHours", 0))
                s_name = subj_map.get(a.get("subjectId", ""), {}).get("name", "Subject")
                alloc_subjects_map[fid].add(s_name)
                c_name = cls_map.get(a.get("classId", ""), {}).get("name", "Class")
                alloc_classes_map[fid].add(c_name)

        # Load scheduled entries
        scheduled_hours_map: Dict[str, int] = defaultdict(int)
        fixed_hours_map: Dict[str, int] = defaultdict(int)
        scheduled_subjects_map: Dict[str, Set[str]] = defaultdict(set)
        scheduled_classes_map: Dict[str, Set[str]] = defaultdict(set)

        if tt_id:
            entries = await timetable_entry_repo.find_many({"timetableId": tt_id, "isActive": True})
            for e in entries:
                for fid in e.get("facultyIds", []):
                    if e.get("entryType") == "SUBJECT":
                        scheduled_hours_map[fid] += 1
                        s_name = subj_map.get(e.get("subjectId", ""), {}).get("name", "Subject")
                        scheduled_subjects_map[fid].add(s_name)
                    else:
                        fixed_hours_map[fid] += 1
                    c_name = cls_map.get(e.get("classId", ""), {}).get("name", "Class")
                    scheduled_classes_map[fid].add(c_name)

        items: List[FacultyWorkloadItem] = []
        total_util = 0.0

        for f in all_faculty:
            fid = f["id"]
            fc = constraint_map.get(fid)
            max_hrs = fc.get("maxWeeklyHours", 16) if fc else 16
            req_hrs = required_hours_map[fid]
            sched_hrs = scheduled_hours_map[fid]
            fix_hrs = fixed_hours_map[fid]
            total_active_hrs = sched_hrs + fix_hrs

            util = round((total_active_hrs / max_hrs) * 100.0, 1) if max_hrs > 0 else 0.0
            total_util += util

            combined_subjects = sorted(list(scheduled_subjects_map[fid].union(alloc_subjects_map[fid])))
            combined_classes = sorted(list(scheduled_classes_map[fid].union(alloc_classes_map[fid])))

            items.append(
                FacultyWorkloadItem(
                    facultyId=fid,
                    facultyName=f.get("name", ""),
                    facultyCode=f.get("facultyCode", ""),
                    designation=f.get("designation", "Faculty"),
                    department=f.get("department"),
                    requiredHours=req_hrs,
                    scheduledHours=sched_hrs,
                    fixedHours=fix_hrs,
                    maxWeeklyHours=max_hrs,
                    utilizationPercent=util,
                    classesCount=len(combined_classes),
                    subjectsCount=len(combined_subjects),
                    subjectsList=combined_subjects,
                    classesList=combined_classes,
                )
            )

        avg_util = round(total_util / len(items), 1) if items else 0.0

        return FacultyWorkloadReport(
            academicYearId=tt.get("academicYearId") if tt else academic_year_id,
            semesterTypeId=tt.get("semesterTypeId") if tt else semester_type_id,
            timetableId=tt_id,
            timetableVersion=tt.get("version") if tt else None,
            timetableStatus=tt.get("status") if tt else None,
            totalFaculty=len(items),
            averageUtilization=avg_util,
            items=items,
        )

    async def get_subject_coverage_report(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        timetable_id: Optional[str] = None,
        class_id: Optional[str] = None,
    ) -> SubjectCoverageReport:
        tt = await self._resolve_timetable(academic_year_id, semester_type_id, timetable_id)
        tt_id = tt["id"] if tt else None

        # Classes
        cls_query = {"isActive": True}
        if class_id:
            from app.utils.object_id import parse_object_id
            cls_query["_id"] = parse_object_id(class_id)
        elif tt:
            cls_query["academicYearId"] = tt["academicYearId"]
            cls_query["semesterTypeId"] = tt["semesterTypeId"]

        classes = await class_repo.find_many(cls_query, sort=[("name", 1)])
        class_map = {c["id"]: c for c in classes}
        class_ids = list(class_map.keys())

        # Allocations
        alloc_query = {"isActive": True, "classId": {"$in": class_ids}}
        if tt:
            alloc_query["academicYearId"] = tt["academicYearId"]
            alloc_query["semesterTypeId"] = tt["semesterTypeId"]
        allocations = await faculty_allocation_repo.find_many(alloc_query)

        # Subjects and Faculty lookup
        subjects = await subject_repo.find_many({"isActive": True})
        subj_map = {s["id"]: s for s in subjects}
        faculty_all = await faculty_repo.find_many({"isActive": True})
        fac_map = {f["id"]: f.get("name", "") for f in faculty_all}

        # Timetable entries count
        scheduled_counts: Dict[Tuple[str, str], int] = defaultdict(int)
        fixed_counts: Dict[Tuple[str, str], int] = defaultdict(int)

        if tt_id:
            entries = await timetable_entry_repo.find_many(
                {"timetableId": tt_id, "classId": {"$in": class_ids}, "isActive": True}
            )
            for e in entries:
                cid = e.get("classId")
                sid = e.get("subjectId")
                if cid and sid:
                    if e.get("isFixed", False):
                        fixed_counts[(cid, sid)] += 1
                    else:
                        scheduled_counts[(cid, sid)] += 1

        items: List[SubjectCoverageItem] = []
        complete_cnt = 0
        shortage_cnt = 0
        over_cnt = 0

        for a in allocations:
            cid = a["classId"]
            sid = a["subjectId"]
            cls_doc = class_map.get(cid, {})
            subj_doc = subj_map.get(sid, {})
            req_hrs = int(a.get("weeklyHours", 0))
            sched_hrs = scheduled_counts[(cid, sid)]
            fixed_hrs = fixed_counts[(cid, sid)]
            total_sched = sched_hrs + fixed_hrs
            remaining = req_hrs - total_sched

            if total_sched == req_hrs:
                cov_status = "COMPLETE"
                complete_cnt += 1
            elif total_sched < req_hrs:
                cov_status = "SHORTAGE"
                shortage_cnt += 1
            else:
                cov_status = "OVER_SCHEDULED"
                over_cnt += 1

            fac_names = [fac_map.get(fid, "") for fid in a.get("facultyIds", []) if fid in fac_map]

            items.append(
                SubjectCoverageItem(
                    classId=cid,
                    className=cls_doc.get("name", "Class"),
                    classDisplayName=cls_doc.get("displayName"),
                    subjectId=sid,
                    subjectCode=subj_doc.get("subjectCode", "SUBJ"),
                    subjectName=subj_doc.get("name", "Subject"),
                    subjectType=subj_doc.get("subjectType", "THEORY"),
                    requiredWeeklyHours=req_hrs,
                    scheduledWeeklyHours=sched_hrs,
                    fixedSubjectHours=fixed_hrs,
                    remainingHours=remaining,
                    coverageStatus=cov_status,
                    facultyNames=fac_names,
                )
            )

        items.sort(key=lambda x: (x.className, x.subjectCode))

        return SubjectCoverageReport(
            academicYearId=tt.get("academicYearId") if tt else academic_year_id,
            semesterTypeId=tt.get("semesterTypeId") if tt else semester_type_id,
            timetableId=tt_id,
            totalSubjects=len(items),
            completeCount=complete_cnt,
            shortageCount=shortage_cnt,
            overScheduledCount=over_cnt,
            items=items,
        )

    async def get_class_load_report(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        timetable_id: Optional[str] = None,
    ) -> ClassLoadReport:
        tt = await self._resolve_timetable(academic_year_id, semester_type_id, timetable_id)
        tt_id = tt["id"] if tt else None

        cls_query = {"isActive": True}
        if tt:
            cls_query["academicYearId"] = tt["academicYearId"]
            cls_query["semesterTypeId"] = tt["semesterTypeId"]
        classes = await class_repo.find_many(cls_query, sort=[("name", 1)])

        working_days = await working_day_repo.find_many({"isActive": True, "isWorkingDay": True})
        day_names = {d["id"]: d.get("name", "") for d in working_days}
        teaching_slots = await time_slot_repo.find_many({"isActive": True, "isTeachingSlot": True})
        total_teaching_slots = len(working_days) * len(teaching_slots)

        items: List[ClassLoadItem] = []

        if tt_id:
            entries = await timetable_entry_repo.find_many({"timetableId": tt_id, "isActive": True})
            entries_by_class: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
            for e in entries:
                entries_by_class[e.get("classId", "")].append(e)

            for c in classes:
                cid = c["id"]
                c_entries = entries_by_class.get(cid, [])
                subj_count = sum(1 for e in c_entries if e.get("entryType") == "SUBJECT")
                fixed_count = sum(1 for e in c_entries if e.get("entryType") != "SUBJECT")
                occupied = len(c_entries)
                free = max(0, total_teaching_slots - occupied)

                daily: Dict[str, int] = defaultdict(int)
                for e in c_entries:
                    dname = day_names.get(e.get("workingDayId", ""), "Day")
                    daily[dname] += 1

                items.append(
                    ClassLoadItem(
                        classId=cid,
                        className=c.get("name", ""),
                        programmeName=c.get("programmeName"),
                        semesterName=c.get("semesterName"),
                        requiredSubjectPeriods=subj_count,
                        scheduledSubjectPeriods=subj_count,
                        fixedActivities=fixed_count,
                        totalOccupiedPeriods=occupied,
                        totalAvailableTeachingSlots=total_teaching_slots,
                        freePeriods=free,
                        dailyLoad=dict(daily),
                    )
                )

        return ClassLoadReport(
            academicYearId=tt.get("academicYearId") if tt else academic_year_id,
            semesterTypeId=tt.get("semesterTypeId") if tt else semester_type_id,
            timetableId=tt_id,
            totalClasses=len(items),
            items=items,
        )

    async def get_resource_utilization_report(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        timetable_id: Optional[str] = None,
        resource_type: Optional[str] = None,
    ) -> ResourceUtilizationReport:
        tt = await self._resolve_timetable(academic_year_id, semester_type_id, timetable_id)
        tt_id = tt["id"] if tt else None

        res_query = {"isActive": True}
        if resource_type:
            res_query["type"] = resource_type.upper()
        resources = await resource_repo.find_many(res_query, sort=[("name", 1)])

        working_days = await working_day_repo.find_many({"isActive": True, "isWorkingDay": True})
        teaching_slots = await time_slot_repo.find_many({"isActive": True, "isTeachingSlot": True})
        total_available_slots = len(working_days) * len(teaching_slots)

        all_classes = await class_repo.find_many({"isActive": True})
        cls_map = {c["id"]: c.get("name", "Class") for c in all_classes}
        all_subjects = await subject_repo.find_many({"isActive": True})
        subj_map = {s["id"]: s.get("name", "Subject") for s in all_subjects}

        items: List[ResourceUtilizationItem] = []
        total_util = 0.0

        if tt_id:
            entries = await timetable_entry_repo.find_many({"timetableId": tt_id, "isActive": True})
            res_slots: Dict[str, Set[Tuple[str, str]]] = defaultdict(set)
            res_classes: Dict[str, Set[str]] = defaultdict(set)
            res_subjects: Dict[str, Set[str]] = defaultdict(set)

            for e in entries:
                rid = e.get("resourceId")
                if rid:
                    d_id = e.get("workingDayId")
                    s_id = e.get("timeSlotId")
                    if d_id and s_id:
                        res_slots[rid].add((d_id, s_id))
                    cid = e.get("classId")
                    if cid and cid in cls_map:
                        res_classes[rid].add(cls_map[cid])
                    sid = e.get("subjectId")
                    if sid and sid in subj_map:
                        res_subjects[rid].add(subj_map[sid])

            for r in resources:
                rid = r["id"]
                used = len(res_slots[rid])
                util = round((used / total_available_slots) * 100.0, 1) if total_available_slots > 0 else 0.0
                total_util += util

                items.append(
                    ResourceUtilizationItem(
                        resourceId=rid,
                        resourceName=r.get("name", ""),
                        resourceCode=r.get("code", ""),
                        resourceType=r.get("type", "CLASSROOM"),
                        capacity=int(r.get("capacity", 0)),
                        availableSlots=total_available_slots,
                        usedSlots=used,
                        utilizationPercent=util,
                        classesUsing=sorted(list(res_classes[rid])),
                        subjectsUsing=sorted(list(res_subjects[rid])),
                    )
                )

        avg_util = round(total_util / len(items), 1) if items else 0.0

        return ResourceUtilizationReport(
            academicYearId=tt.get("academicYearId") if tt else academic_year_id,
            semesterTypeId=tt.get("semesterTypeId") if tt else semester_type_id,
            timetableId=tt_id,
            totalResources=len(items),
            averageUtilization=avg_util,
            items=items,
        )

    async def get_substitutions_report(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        faculty_id: Optional[str] = None,
        class_id: Optional[str] = None,
        status_filter: Optional[str] = None,
    ):
        from app.schemas.reports import SubstitutionReport, SubstitutionReportItem
        from app.repositories.base_repository import BaseRepository
        sub_repo = BaseRepository("substitutions")
        query: Dict[str, Any] = {}

        if start_date or end_date:
            date_query: Dict[str, Any] = {}
            if start_date:
                date_query["$gte"] = start_date
            if end_date:
                date_query["$lte"] = end_date
            query["date"] = date_query

        if faculty_id:
            query["$or"] = [{"absentFacultyId": faculty_id}, {"substituteFacultyId": faculty_id}]
        if class_id:
            query["classId"] = class_id
        if status_filter:
            query["status"] = status_filter

        docs = await sub_repo.find_many(query, sort=[("date", -1)])
        items: List[SubstitutionReportItem] = []
        assigned_cnt = 0
        cancelled_cnt = 0

        for d in docs:
            st = d.get("status", "ASSIGNED")
            if st == "ASSIGNED":
                assigned_cnt += 1
            elif st == "CANCELLED":
                cancelled_cnt += 1

            absent_fac = await faculty_repo.get_by_id(d.get("absentFacultyId", ""))
            sub_fac = await faculty_repo.get_by_id(d.get("substituteFacultyId", "")) if d.get("substituteFacultyId") else None
            cls = await class_repo.get_by_id(d.get("classId", ""))
            sub = await subject_repo.get_by_id(d.get("subjectId", ""))
            slot = await time_slot_repo.get_by_id(d.get("timeSlotId", ""))

            items.append(
                SubstitutionReportItem(
                    substitutionId=str(d.get("id") or d.get("_id")),
                    date=d.get("date", ""),
                    absentFacultyId=d.get("absentFacultyId", ""),
                    absentFacultyName=absent_fac.get("name") if absent_fac else "Faculty",
                    substituteFacultyId=d.get("substituteFacultyId"),
                    substituteFacultyName=sub_fac.get("name") if sub_fac else None,
                    classId=d.get("classId", ""),
                    className=cls.get("name") if cls else "Class",
                    subjectId=d.get("subjectId", ""),
                    subjectName=sub.get("name") if sub else "Subject",
                    subjectCode=sub.get("subjectCode") if sub else "",
                    timeSlotName=slot.get("name") if slot else "Period",
                    status=st,
                    assignmentType=d.get("assignmentType", "SUBSTITUTION"),
                )
            )

        return SubstitutionReport(
            startDate=start_date,
            endDate=end_date,
            totalSubstitutions=len(items),
            assignedCount=assigned_cnt,
            cancelledCount=cancelled_cnt,
            items=items,
        )

    async def get_operational_workload_report(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        faculty_id: Optional[str] = None,
    ):
        from app.schemas.reports import FacultyOperationalWorkloadReport, FacultyOperationalWorkloadItem
        from app.repositories.base_repository import BaseRepository
        sub_repo = BaseRepository("substitutions")
        leave_repo = BaseRepository("faculty_leave_requests")

        fac_query: Dict[str, Any] = {"isActive": True}
        if faculty_id:
            fac_query["_id"] = faculty_id
        all_fac = await faculty_repo.find_many(fac_query, sort=[("name", 1)])

        # Find active published timetable to compute regular scheduled periods
        published_tt = await timetable_repo.find_one({"status": "PUBLISHED"})
        tt_id = published_tt.get("id") if published_tt else None

        items: List[FacultyOperationalWorkloadItem] = []

        for f in all_fac:
            fid = str(f.get("id") or f.get("_id"))

            # Regular scheduled periods in published weekly timetable
            reg_scheduled = 0
            if tt_id:
                reg_entries = await timetable_entry_repo.find_many({
                    "timetableId": tt_id,
                    "facultyIds": fid,
                    "isActive": True,
                })
                reg_scheduled = len(reg_entries)

            # Substitutions served by this faculty in the date range
            sub_query: Dict[str, Any] = {
                "substituteFacultyId": fid,
                "status": "ASSIGNED",
                "assignmentType": "SUBSTITUTION",
            }
            if start_date or end_date:
                dq: Dict[str, Any] = {}
                if start_date:
                    dq["$gte"] = start_date
                if end_date:
                    dq["$lte"] = end_date
                sub_query["date"] = dq

            subs = await sub_repo.find_many(sub_query)
            sub_periods = len(subs)

            # Approved leave count
            leave_query: Dict[str, Any] = {
                "facultyId": fid,
                "status": "APPROVED",
            }
            if start_date or end_date:
                if start_date:
                    leave_query["startDate"] = {"$gte": start_date}
                if end_date:
                    leave_query["endDate"] = {"$lte": end_date}
            leaves = await leave_repo.find_many(leave_query)
            leave_days = len(leaves)

            total_operational = reg_scheduled + sub_periods

            items.append(
                FacultyOperationalWorkloadItem(
                    facultyId=fid,
                    facultyName=f.get("name", "Faculty"),
                    facultyCode=f.get("facultyCode", ""),
                    department=f.get("department"),
                    designation=f.get("designation"),
                    regularScheduledPeriods=reg_scheduled,
                    substitutePeriods=sub_periods,
                    totalOperationalPeriods=total_operational,
                    approvedLeaveDays=leave_days,
                )
            )

        return FacultyOperationalWorkloadReport(
            startDate=start_date,
            endDate=end_date,
            totalFaculty=len(items),
            items=items,
        )


report_service = ReportService()

