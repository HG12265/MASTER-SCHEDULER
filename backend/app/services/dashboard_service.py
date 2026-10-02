from typing import Any, Dict, List
from app.repositories.academic_year_repository import academic_year_repo
from app.repositories.class_repository import class_repo
from app.repositories.faculty_allocation_repository import faculty_allocation_repo
from app.repositories.faculty_repository import faculty_repo
from app.repositories.programme_repository import programme_repo
from app.repositories.resource_repository import resource_repo
from app.repositories.semester_type_repository import semester_type_repo
from app.repositories.subject_repository import subject_repo
from app.repositories.timetable_repository import timetable_repo
from app.schemas.dashboard import AttentionItem, ResourceBarData, WorkloadBarData
from app.services.report_service import report_service


class DashboardService:
    async def get_summary(self) -> Dict[str, Any]:
        """
        Produce comprehensive dashboard statistics with real academic and timetable analytics.
        """
        active_filter = {"isActive": True}

        # 1. Master entities count
        programmes_count = await programme_repo.count(active_filter)
        classes_count = await class_repo.count(active_filter)
        faculty_count = await faculty_repo.count(active_filter)
        subjects_count = await subject_repo.count(active_filter)
        resources_count = await resource_repo.count(active_filter)
        allocations_count = await faculty_allocation_repo.count(active_filter)

        # 2. Term context
        current_ay = await academic_year_repo.find_current()
        st_docs = await semester_type_repo.find_many(active_filter, limit=1)
        current_st = st_docs[0] if st_docs else None

        # 3. Timetable status breakdown
        all_timetables = await timetable_repo.find_many({}, sort=[("createdAt", -1)])
        total_tt = len(all_timetables)
        draft_count = sum(1 for t in all_timetables if t.get("status") == "DRAFT")
        ready_count = sum(1 for t in all_timetables if t.get("status") == "READY_FOR_APPROVAL")
        pub_count = sum(1 for t in all_timetables if t.get("status") == "PUBLISHED")
        arch_count = sum(1 for t in all_timetables if t.get("status") == "ARCHIVED")

        latest_tt_doc = all_timetables[0] if all_timetables else None
        latest_tt = None
        if latest_tt_doc:
            latest_tt = {
                "id": latest_tt_doc["id"],
                "name": latest_tt_doc.get("name", "Timetable"),
                "version": latest_tt_doc.get("version", 1),
                "revision": latest_tt_doc.get("revision", 1),
                "status": latest_tt_doc.get("status", "DRAFT"),
                "validationStatus": latest_tt_doc.get("validationStatus", "VALID"),
                "generatedAt": latest_tt_doc.get("generatedAt"),
                "publishedAt": latest_tt_doc.get("publishedAt"),
            }

        # Count total validation issues across active drafts
        val_issues = sum(len(t.get("validationIssues", [])) for t in all_timetables if t.get("status") in ("DRAFT", "READY_FOR_APPROVAL"))

        # 4. Attention Required items
        attention_items: List[Dict[str, Any]] = []

        if ready_count > 0:
            attention_items.append({
                "id": "ready_for_approval",
                "type": "READY_FOR_APPROVAL",
                "title": f"{ready_count} Timetable(s) Awaiting Approval",
                "message": "Timetables have passed validation and are ready to be published as official schedules.",
                "severity": "info",
                "actionUrl": "/timetables",
            })

        invalid_drafts = sum(1 for t in all_timetables if t.get("status") == "DRAFT" and t.get("validationStatus") == "INVALID")
        if invalid_drafts > 0:
            attention_items.append({
                "id": "drafts_need_repair",
                "type": "INVALID_TIMETABLE",
                "title": f"{invalid_drafts} Draft Timetable(s) Require Repair",
                "message": "Manual changes or deletions resulted in unsatisfied curriculum constraints.",
                "severity": "error",
                "actionUrl": "/timetables",
            })

        if pub_count == 0 and total_tt > 0:
            attention_items.append({
                "id": "no_published",
                "type": "NO_PUBLISHED_TIMETABLE",
                "title": "No Official Timetable Published",
                "message": "All current timetables are in draft or archive status. Review and publish an official schedule.",
                "severity": "warning",
                "actionUrl": "/timetables",
            })

        # 5. Faculty Workload Chart Data (Top 8 faculty)
        wl_report = await report_service.get_faculty_workload_report()
        workload_chart = []
        for item in wl_report.items[:8]:
            workload_chart.append({
                "facultyId": item.facultyId,
                "facultyName": item.facultyName,
                "facultyCode": item.facultyCode,
                "scheduledHours": item.scheduledHours + item.fixedHours,
                "maxWeeklyHours": item.maxWeeklyHours,
                "utilizationPercent": item.utilizationPercent,
            })

        # 6. Resource Utilization Chart Data
        res_report = await report_service.get_resource_utilization_report()
        resource_chart = []
        for r in res_report.items[:8]:
            resource_chart.append({
                "resourceId": r.resourceId,
                "resourceName": r.resourceName,
                "resourceCode": r.resourceCode,
                "resourceType": r.resourceType,
                "usedSlots": r.usedSlots,
                "availableSlots": r.availableSlots,
                "utilizationPercent": r.utilizationPercent,
            })

        return {
            "programmes": programmes_count,
            "classes": classes_count,
            "faculty": faculty_count,
            "subjects": subjects_count,
            "resources": resources_count,
            "allocations": allocations_count,
            "activeAcademicYear": current_ay,
            "currentSemesterType": current_st,
            "latestTimetable": latest_tt,
            "publishedTimetablesCount": pub_count,
            "readyForApprovalCount": ready_count,
            "draftTimetablesCount": draft_count,
            "archivedTimetablesCount": arch_count,
            "totalTimetablesCount": total_tt,
            "validationIssuesCount": val_issues,
            "attentionItems": attention_items,
            "facultyWorkloadChart": workload_chart,
            "resourceUtilizationChart": resource_chart,
        }


dashboard_service = DashboardService()
