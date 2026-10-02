from datetime import datetime, timezone
from typing import List, Dict, Any, Set
from app.repositories.base_repository import BaseRepository
from app.schemas.integrity import IntegrityCheckResult, IntegrityIssue, IssueSeverity
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DatabaseIntegrityService:
    async def run_integrity_check(self) -> IntegrityCheckResult:
        """
        Scan MongoDB collections for referential integrity violations, orphan documents,
        and invalid relationship links. Returns non-destructive diagnosis.
        """
        issues: List[IntegrityIssue] = []

        # Instantiate repositories
        programme_repo = BaseRepository("programmes")
        semester_repo = BaseRepository("semesters")
        class_repo = BaseRepository("classes")
        faculty_repo = BaseRepository("faculty")
        subject_repo = BaseRepository("subjects")
        resource_repo = BaseRepository("resources")
        alloc_repo = BaseRepository("faculty_subject_allocations")
        timetable_repo = BaseRepository("timetables")
        entry_repo = BaseRepository("timetable_entries")
        ay_repo = BaseRepository("academic_years")
        st_repo = BaseRepository("semester_types")

        # 1. Fetch valid IDs into Sets
        programmes = await programme_repo.find_many({})
        prog_ids: Set[str] = {str(p.get("id") or p.get("_id")) for p in programmes}

        semesters = await semester_repo.find_many({})
        sem_ids: Set[str] = {str(s.get("id") or s.get("_id")) for s in semesters}

        classes = await class_repo.find_many({})
        class_ids: Set[str] = {str(c.get("id") or c.get("_id")) for c in classes}

        faculties = await faculty_repo.find_many({})
        faculty_ids: Set[str] = {str(f.get("id") or f.get("_id")) for f in faculties}

        subjects = await subject_repo.find_many({})
        subject_ids: Set[str] = {str(s.get("id") or s.get("_id")) for s in subjects}

        resources = await resource_repo.find_many({})
        resource_ids: Set[str] = {str(r.get("id") or r.get("_id")) for r in resources}

        academic_years = await ay_repo.find_many({})
        ay_ids: Set[str] = {str(a.get("id") or a.get("_id")) for a in academic_years}

        timetables = await timetable_repo.find_many({})
        timetable_ids: Set[str] = {str(t.get("id") or t.get("_id")) for t in timetables}

        # Check 1: Semesters pointing to non-existent Programmes
        for s in semesters:
            pid = str(s.get("programmeId", ""))
            sid = str(s.get("id") or s.get("_id"))
            if pid and pid not in prog_ids:
                issues.append(
                    IntegrityIssue(
                        severity=IssueSeverity.ERROR,
                        category="Broken Reference",
                        entityType="Semester",
                        entityId=sid,
                        entityIdentifier=s.get("displayName") or s.get("name"),
                        description=f"Semester references missing Programme ID '{pid}'",
                        suggestedFix="Reassign semester to an existing Programme or delete orphaned semester.",
                    )
                )

        # Check 2: Classes pointing to non-existent Programmes, Semesters, or Academic Years
        for c in classes:
            cid = str(c.get("id") or c.get("_id"))
            pid = str(c.get("programmeId", ""))
            sem_id = str(c.get("semesterId", ""))
            ay_id = str(c.get("academicYearId", ""))

            if pid and pid not in prog_ids:
                issues.append(
                    IntegrityIssue(
                        severity=IssueSeverity.ERROR,
                        category="Broken Reference",
                        entityType="Class",
                        entityId=cid,
                        entityIdentifier=c.get("name"),
                        description=f"Class references non-existent Programme ID '{pid}'",
                        suggestedFix="Update class with a valid programme reference.",
                    )
                )
            if sem_id and sem_id not in sem_ids:
                issues.append(
                    IntegrityIssue(
                        severity=IssueSeverity.ERROR,
                        category="Broken Reference",
                        entityType="Class",
                        entityId=cid,
                        entityIdentifier=c.get("name"),
                        description=f"Class references non-existent Semester ID '{sem_id}'",
                        suggestedFix="Update class with a valid semester reference.",
                    )
                )
            if ay_id and ay_id not in ay_ids:
                issues.append(
                    IntegrityIssue(
                        severity=IssueSeverity.WARNING,
                        category="Broken Reference",
                        entityType="Class",
                        entityId=cid,
                        entityIdentifier=c.get("name"),
                        description=f"Class references non-existent Academic Year ID '{ay_id}'",
                        suggestedFix="Reassign class to a valid active Academic Year.",
                    )
                )

        # Check 3: Subjects pointing to non-existent Programmes or Semesters
        for sub in subjects:
            sub_id = str(sub.get("id") or sub.get("_id"))
            pid = str(sub.get("programmeId", ""))
            sem_id = str(sub.get("semesterId", ""))

            if pid and pid not in prog_ids:
                issues.append(
                    IntegrityIssue(
                        severity=IssueSeverity.ERROR,
                        category="Broken Reference",
                        entityType="Subject",
                        entityId=sub_id,
                        entityIdentifier=sub.get("subjectCode") or sub.get("name"),
                        description=f"Subject references non-existent Programme ID '{pid}'",
                        suggestedFix="Update subject with an active Programme ID.",
                    )
                )
            if sem_id and sem_id not in sem_ids:
                issues.append(
                    IntegrityIssue(
                        severity=IssueSeverity.ERROR,
                        category="Broken Reference",
                        entityType="Subject",
                        entityId=sub_id,
                        entityIdentifier=sub.get("subjectCode") or sub.get("name"),
                        description=f"Subject references non-existent Semester ID '{sem_id}'",
                        suggestedFix="Update subject with an active Semester ID.",
                    )
                )

        # Check 4: Faculty Subject Allocations
        allocations = await alloc_repo.find_many({})
        for a in allocations:
            aid = str(a.get("id") or a.get("_id"))
            cid = str(a.get("classId", ""))
            sub_id = str(a.get("subjectId", ""))
            fids = a.get("facultyIds", [])

            if cid and cid not in class_ids:
                issues.append(
                    IntegrityIssue(
                        severity=IssueSeverity.ERROR,
                        category="Broken Reference",
                        entityType="FacultyAllocation",
                        entityId=aid,
                        entityIdentifier=f"Allocation for Class {cid}",
                        description=f"Allocation references non-existent Class ID '{cid}'",
                        suggestedFix="Delete or reassign this allocation.",
                    )
                )
            if sub_id and sub_id not in subject_ids:
                issues.append(
                    IntegrityIssue(
                        severity=IssueSeverity.ERROR,
                        category="Broken Reference",
                        entityType="FacultyAllocation",
                        entityId=aid,
                        entityIdentifier=f"Allocation for Subject {sub_id}",
                        description=f"Allocation references non-existent Subject ID '{sub_id}'",
                        suggestedFix="Delete or reassign this allocation.",
                    )
                )
            for fid in fids:
                if str(fid) not in faculty_ids:
                    issues.append(
                        IntegrityIssue(
                            severity=IssueSeverity.ERROR,
                            category="Broken Reference",
                            entityType="FacultyAllocation",
                            entityId=aid,
                            entityIdentifier=f"Allocation ID {aid}",
                            description=f"Allocation references non-existent Faculty ID '{fid}'",
                            suggestedFix="Remove missing faculty ID from allocation list.",
                        )
                    )

        # Check 5: Orphan Timetable Entries
        all_entries = await entry_repo.find_many({}, limit=5000)
        for ent in all_entries:
            eid = str(ent.get("id") or ent.get("_id"))
            tt_id = str(ent.get("timetableId", ""))
            if tt_id and tt_id not in timetable_ids:
                issues.append(
                    IntegrityIssue(
                        severity=IssueSeverity.ERROR,
                        category="Orphan Record",
                        entityType="TimetableEntry",
                        entityId=eid,
                        entityIdentifier=f"Entry in Class {ent.get('className', 'Unknown')}",
                        description=f"Timetable entry references missing Timetable ID '{tt_id}'",
                        suggestedFix="Purge orphan timetable entries.",
                    )
                )

        # Check 6: Published Timetables with Zero Entries
        for tt in timetables:
            tt_id = str(tt.get("id") or tt.get("_id"))
            if tt.get("status") == "PUBLISHED":
                entry_count = await entry_repo.count({"timetableId": tt_id, "isActive": True})
                if entry_count == 0:
                    issues.append(
                        IntegrityIssue(
                            severity=IssueSeverity.WARNING,
                            category="Data Anomaly",
                            entityType="Timetable",
                            entityId=tt_id,
                            entityIdentifier=tt.get("name", "Published Timetable"),
                            description=f"Timetable is marked as PUBLISHED but contains 0 active sessions.",
                            suggestedFix="Verify timetable generation or switch status back to DRAFT.",
                        )
                    )

        error_cnt = sum(1 for i in issues if i.severity == IssueSeverity.ERROR)
        warning_cnt = sum(1 for i in issues if i.severity == IssueSeverity.WARNING)
        info_cnt = sum(1 for i in issues if i.severity == IssueSeverity.INFO)

        return IntegrityCheckResult(
            totalIssues=len(issues),
            errorCount=error_cnt,
            warningCount=warning_cnt,
            infoCount=info_cnt,
            passed=(error_cnt == 0),
            issues=issues,
            checkedAt=datetime.now(timezone.utc).isoformat(),
        )


database_integrity_service = DatabaseIntegrityService()
