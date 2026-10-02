from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.repositories.timetable_repository import timetable_repo, timetable_entry_repo
from app.repositories.timetable_change_history_repository import timetable_change_history_repo
from app.schemas.timetable import TimetableResponse, TimetableStatus
from app.services.timetable_conflict_service import timetable_conflict_service
from app.services.timetable_generation_service import timetable_generation_service
from app.utils.exceptions import ConflictException, NotFoundException, BadRequestException
from app.utils.object_id import doc_to_dict, parse_object_id


class TimetablePublicationService:
    async def submit_for_approval(self, timetable_id: str, performed_by: Optional[str] = None) -> TimetableResponse:
        tt = await timetable_repo.get_by_id(timetable_id)
        if not tt:
            raise NotFoundException(f"Timetable with ID '{timetable_id}' not found")

        if tt.get("status") != TimetableStatus.DRAFT:
            raise ConflictException(f"Only DRAFT timetables can be submitted for approval (current status: {tt.get('status')}).")

        # 1. Run full validation
        ctx = await timetable_conflict_service.load_context(timetable_id)
        report = timetable_conflict_service.validate_entire_timetable(ctx)
        if report.status == "INVALID":
            raise BadRequestException(
                f"Timetable cannot be submitted because validation errors exist ({report.summary.errors} error(s)). Please resolve all conflicts before submission."
            )

        now = datetime.now(timezone.utc)
        await timetable_repo.update_by_id(
            timetable_id,
            {
                "status": TimetableStatus.READY_FOR_APPROVAL,
                "validationStatus": "VALID",
                "validationIssues": [],
                "updatedAt": now,
            },
        )

        await timetable_change_history_repo.create_change_record(
            timetable_id=timetable_id,
            change_type="SUBMIT_FOR_APPROVAL",
            description="Timetable submitted for administrative approval",
            before_snapshot={"status": TimetableStatus.DRAFT},
            after_snapshot={"status": TimetableStatus.READY_FOR_APPROVAL},
            revision_before=tt.get("revision", 1),
            revision_after=tt.get("revision", 1),
            performed_by=performed_by,
        )

        return await timetable_generation_service.get_by_id(timetable_id)

    async def return_to_draft(self, timetable_id: str, performed_by: Optional[str] = None) -> TimetableResponse:
        tt = await timetable_repo.get_by_id(timetable_id)
        if not tt:
            raise NotFoundException(f"Timetable with ID '{timetable_id}' not found")

        if tt.get("status") != TimetableStatus.READY_FOR_APPROVAL:
            raise ConflictException(f"Only timetables in READY_FOR_APPROVAL can be returned to DRAFT (current status: {tt.get('status')}).")

        now = datetime.now(timezone.utc)
        await timetable_repo.update_by_id(
            timetable_id,
            {
                "status": TimetableStatus.DRAFT,
                "updatedAt": now,
            },
        )

        await timetable_change_history_repo.create_change_record(
            timetable_id=timetable_id,
            change_type="RETURN_TO_DRAFT",
            description="Timetable returned to DRAFT for further editing",
            before_snapshot={"status": TimetableStatus.READY_FOR_APPROVAL},
            after_snapshot={"status": TimetableStatus.DRAFT},
            revision_before=tt.get("revision", 1),
            revision_after=tt.get("revision", 1),
            performed_by=performed_by,
        )

        return await timetable_generation_service.get_by_id(timetable_id)

    async def publish_timetable(self, timetable_id: str, published_by: Optional[str] = None) -> TimetableResponse:
        tt = await timetable_repo.get_by_id(timetable_id)
        if not tt:
            raise NotFoundException(f"Timetable with ID '{timetable_id}' not found")

        if tt.get("status") == TimetableStatus.PUBLISHED:
            return await timetable_generation_service.get_by_id(timetable_id)

        if tt.get("status") not in (TimetableStatus.READY_FOR_APPROVAL, TimetableStatus.DRAFT):
            raise ConflictException(f"Timetable in '{tt.get('status')}' status cannot be published.")

        # CRITICAL RULE: Run a fresh full validation right now!
        ctx = await timetable_conflict_service.load_context(timetable_id)
        report = timetable_conflict_service.validate_entire_timetable(ctx)
        if report.status == "INVALID":
            raise ConflictException(
                f"Publishing blocked: Fresh validation found {report.summary.errors} conflict(s). Timetable must be 100% valid to publish."
            )

        now = datetime.now(timezone.utc)

        # Archive any previous published timetable for this term
        await timetable_repo.archive_previous_published(
            academic_year_id=tt["academicYearId"],
            semester_type_id=tt["semesterTypeId"],
            exclude_id=timetable_id,
        )

        # Mark target timetable as PUBLISHED
        await timetable_repo.update_by_id(
            timetable_id,
            {
                "status": TimetableStatus.PUBLISHED,
                "publishedAt": now,
                "publishedBy": published_by or "Administrator",
                "publicationRevision": tt.get("revision", 1),
                "publicationVersion": tt.get("version", 1),
                "validationStatus": "VALID",
                "validationIssues": [],
                "updatedAt": now,
            },
        )

        await timetable_change_history_repo.create_change_record(
            timetable_id=timetable_id,
            change_type="PUBLISHED",
            description=f"Timetable v{tt.get('version', 1)} officially published",
            before_snapshot={"status": tt.get("status")},
            after_snapshot={"status": TimetableStatus.PUBLISHED, "publishedAt": str(now)},
            revision_before=tt.get("revision", 1),
            revision_after=tt.get("revision", 1),
            performed_by=published_by,
        )

        return await timetable_generation_service.get_by_id(timetable_id)

    async def archive_timetable(self, timetable_id: str, performed_by: Optional[str] = None) -> TimetableResponse:
        tt = await timetable_repo.get_by_id(timetable_id)
        if not tt:
            raise NotFoundException(f"Timetable with ID '{timetable_id}' not found")

        now = datetime.now(timezone.utc)
        await timetable_repo.update_by_id(
            timetable_id,
            {
                "status": TimetableStatus.ARCHIVED,
                "updatedAt": now,
            },
        )

        await timetable_change_history_repo.create_change_record(
            timetable_id=timetable_id,
            change_type="ARCHIVED",
            description="Timetable marked as ARCHIVED",
            before_snapshot={"status": tt.get("status")},
            after_snapshot={"status": TimetableStatus.ARCHIVED},
            revision_before=tt.get("revision", 1),
            revision_after=tt.get("revision", 1),
            performed_by=performed_by,
        )

        return await timetable_generation_service.get_by_id(timetable_id)

    async def create_draft_copy(self, timetable_id: str, created_by: Optional[str] = None) -> TimetableResponse:
        source_tt = await timetable_repo.get_by_id(timetable_id)
        if not source_tt:
            raise NotFoundException(f"Timetable with ID '{timetable_id}' not found")

        next_version = await timetable_repo.get_next_version(
            academic_year_id=source_tt["academicYearId"],
            semester_type_id=source_tt["semesterTypeId"],
        )

        now = datetime.now(timezone.utc)
        clean_name = source_tt.get("name", "Timetable")
        if " v" in clean_name:
            clean_name = clean_name.split(" v")[0]
        if " (" in clean_name:
            clean_name = clean_name.split(" (")[0]
        new_name = f"{clean_name} v{next_version} (Draft)"

        new_tt_data = {
            "academicYearId": source_tt["academicYearId"],
            "semesterTypeId": source_tt["semesterTypeId"],
            "name": new_name,
            "version": next_version,
            "revision": 1,
            "status": TimetableStatus.DRAFT,
            "solverStatus": source_tt.get("solverStatus", "FEASIBLE"),
            "validationStatus": source_tt.get("validationStatus", "VALID"),
            "validationIssues": [],
            "objectiveValue": source_tt.get("objectiveValue"),
            "generatedAt": now,
            "generationDurationMs": 0,
            "solverOptions": source_tt.get("solverOptions", {}),
            "stats": source_tt.get("stats", {}),
            "classIds": source_tt.get("classIds", []),
            "createdAt": now,
            "updatedAt": now,
            "isActive": True,
        }

        created_tt = await timetable_repo.create(new_tt_data)
        new_tt_id = created_tt["id"]

        # Fetch and duplicate all entries
        entries = await timetable_entry_repo.find_many({"timetableId": timetable_id})
        new_entries = []
        for e in entries:
            entry_copy = dict(e)
            entry_copy.pop("_id", None)
            entry_copy.pop("id", None)
            entry_copy["timetableId"] = new_tt_id
            new_entries.append(entry_copy)

        if new_entries:
            await timetable_entry_repo.insert_many_entries(new_entries)

        await timetable_change_history_repo.create_change_record(
            timetable_id=new_tt_id,
            change_type="CLONED_DRAFT",
            description=f"Draft timetable v{next_version} cloned from timetable v{source_tt.get('version', 1)}",
            before_snapshot={"sourceTimetableId": timetable_id, "sourceVersion": source_tt.get("version", 1)},
            after_snapshot={"newTimetableId": new_tt_id, "version": next_version, "entriesCloned": len(new_entries)},
            revision_before=1,
            revision_after=1,
            performed_by=created_by,
        )

        return await timetable_generation_service.get_by_id(new_tt_id)


timetable_publication_service = TimetablePublicationService()
