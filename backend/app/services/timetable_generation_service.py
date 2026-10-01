from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.repositories.timetable_repository import timetable_repo, timetable_entry_repo
from app.repositories.academic_year_repository import academic_year_repo
from app.repositories.semester_type_repository import semester_type_repo
from app.repositories.class_repository import class_repo
from app.repositories.faculty_repository import faculty_repo
from app.repositories.subject_repository import subject_repo
from app.repositories.resource_repository import resource_repo
from app.repositories.working_day_repository import working_day_repo
from app.repositories.time_slot_repository import time_slot_repo
from app.scheduler.engine import scheduler_engine
from app.services.scheduler_validation_service import scheduler_validation_service
from app.schemas.timetable import (
    TimetableGenerateRequest,
    TimetableResponse,
    TimetableEntryResponse,
    TimetableMasterViewResponse,
    TimetableStatus,
    SolverStatus,
    TimetableSummaryStats,
)
from app.utils.exceptions import NotFoundException, BadRequestException, ConflictException


class TimetableGenerationService:
    async def generate(self, req: TimetableGenerateRequest) -> Dict[str, Any]:
        # 1. Mandatory Pre-Solver Readiness & Structural Validation
        val_res = await scheduler_validation_service.validate_term(
            academic_year_id=req.academicYearId,
            semester_type_id=req.semesterTypeId,
        )
        if not val_res.ready:
            return {
                "success": False,
                "message": "Scheduler configuration is not ready. Resolve all errors before timetable generation.",
                "ready": False,
                "summary": val_res.summary.model_dump(),
                "issues": [i.model_dump() for i in val_res.issues],
            }

        solver_opts = req.solverOptions or {}
        max_seconds = solver_opts.maxSolveSeconds if hasattr(solver_opts, "maxSolveSeconds") else 30
        num_workers = solver_opts.numWorkers if hasattr(solver_opts, "numWorkers") else 4
        random_seed = solver_opts.randomSeed if hasattr(solver_opts, "randomSeed") else 42

        # 2. Execute CP-SAT Scheduler Engine
        output = await scheduler_engine.generate_timetable(
            academic_year_id=req.academicYearId,
            semester_type_id=req.semesterTypeId,
            class_ids=req.classIds,
            max_solve_seconds=max_seconds,
            num_workers=num_workers,
            random_seed=random_seed,
        )

        if output.solver_status in ("INFEASIBLE", "UNKNOWN"):
            return {
                "success": False,
                "message": "No feasible timetable could be generated with the current hard constraints.",
                "solverStatus": output.solver_status,
                "diagnostics": output.diagnostics,
                "durationMs": output.duration_ms,
            }

        # 3. Term Names & Version Calculation
        ay = await academic_year_repo.get_by_id(req.academicYearId)
        st = await semester_type_repo.get_by_id(req.semesterTypeId)

        if req.replaceExistingDraft:
            await timetable_repo.archive_drafts(req.academicYearId, req.semesterTypeId)

        version = await timetable_repo.get_next_version(req.academicYearId, req.semesterTypeId)
        now = datetime.now(timezone.utc)

        # 4. Save Timetable Document
        timetable_doc = {
            "academicYearId": req.academicYearId,
            "semesterTypeId": req.semesterTypeId,
            "name": f"{ay.get('name', 'AY')} - {st.get('name', 'Term')} Timetable v{version}",
            "version": version,
            "revision": 1,
            "status": TimetableStatus.DRAFT,
            "solverStatus": output.solver_status,
            "validationStatus": "VALID",
            "validationIssues": [],
            "objectiveValue": output.objective_value,
            "generatedAt": now,
            "generationDurationMs": output.duration_ms,
            "solverOptions": {
                "maxSolveSeconds": max_seconds,
                "numWorkers": num_workers,
                "randomSeed": random_seed,
            },
            "stats": output.stats,
            "classIds": req.classIds or [c["classId"] for c in output.stats.get("classCoverage", [])],
            "isActive": True,
            "createdAt": now,
            "updatedAt": now,
        }

        created_tt = await timetable_repo.create(timetable_doc)
        tt_id = created_tt["id"]

        # 5. Save Timetable Entries
        raw_entries = []
        for e in output.entries:
            raw_entries.append({
                "timetableId": tt_id,
                "academicYearId": req.academicYearId,
                "semesterTypeId": req.semesterTypeId,
                "classId": e.class_id,
                "workingDayId": e.working_day_id,
                "timeSlotId": e.time_slot_id,
                "allocationId": e.allocation_id,
                "subjectId": e.subject_id,
                "facultyIds": e.faculty_ids,
                "resourceId": e.resource_id,
                "entryType": e.entry_type,
                "title": e.title,
                "blockId": e.block_id,
                "blockSize": e.block_size,
                "blockIndex": e.block_index,
                "isFixed": e.is_fixed,
                "isLocked": e.is_locked,
                "isManuallyLocked": e.is_manually_locked,
                "lockedAt": None,
                "lockedBy": None,
                "isGenerated": e.is_generated,
                "isActive": True,
            })

        await timetable_entry_repo.insert_many_entries(raw_entries)

        response_data = await self.get_by_id(tt_id)
        return {
            "success": True,
            "message": f"Timetable generated successfully as Version {version} with status {output.solver_status}.",
            "timetable": response_data,
        }

    async def get_by_id(self, timetable_id: str) -> TimetableResponse:
        tt = await timetable_repo.get_by_id(timetable_id)
        if not tt:
            raise NotFoundException(f"Timetable with ID '{timetable_id}' not found")

        ay = await academic_year_repo.get_by_id(tt["academicYearId"])
        st = await semester_type_repo.get_by_id(tt["semesterTypeId"])

        tt_data = dict(tt)
        tt_data["academicYearName"] = ay.get("name") if ay else None
        tt_data["semesterTypeName"] = st.get("name") if st else None

        return TimetableResponse(**tt_data)

    async def list_timetables(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[TimetableResponse]:
        filter_dict: Dict[str, Any] = {"isActive": True}
        if academic_year_id:
            filter_dict["academicYearId"] = academic_year_id
        if semester_type_id:
            filter_dict["semesterTypeId"] = semester_type_id
        if status:
            filter_dict["status"] = status

        records = await timetable_repo.find_many(filter_dict, sort=[("version", -1)])
        ay_cache: Dict[str, str] = {}
        st_cache: Dict[str, str] = {}

        results = []
        for r in records:
            ay_id = r["academicYearId"]
            if ay_id not in ay_cache:
                ay_doc = await academic_year_repo.get_by_id(ay_id)
                ay_cache[ay_id] = ay_doc.get("name", "") if ay_doc else ""

            st_id = r["semesterTypeId"]
            if st_id not in st_cache:
                st_doc = await semester_type_repo.get_by_id(st_id)
                st_cache[st_id] = st_doc.get("name", "") if st_doc else ""

            r_data = dict(r)
            r_data["academicYearName"] = ay_cache[ay_id]
            r_data["semesterTypeName"] = st_cache[st_id]
            results.append(TimetableResponse(**r_data))

        return results

    async def get_entries(
        self,
        timetable_id: str,
        class_id: Optional[str] = None,
        faculty_id: Optional[str] = None,
        working_day_id: Optional[str] = None,
        time_slot_id: Optional[str] = None,
        subject_id: Optional[str] = None,
        resource_id: Optional[str] = None,
    ) -> List[TimetableEntryResponse]:
        raw_entries = await timetable_entry_repo.find_entries(
            timetable_id=timetable_id,
            class_id=class_id,
            faculty_id=faculty_id,
            working_day_id=working_day_id,
            time_slot_id=time_slot_id,
            subject_id=subject_id,
            resource_id=resource_id,
        )
        return await self._enrich_entries(raw_entries)

    async def get_class_timetable(self, timetable_id: str, class_id: str) -> List[TimetableEntryResponse]:
        entries = await self.get_entries(timetable_id, class_id=class_id)
        entries.sort(key=lambda e: (e.dayOrder or 0, e.slotOrder or 0))
        return entries

    async def get_faculty_timetable(self, timetable_id: str, faculty_id: str) -> List[TimetableEntryResponse]:
        entries = await self.get_entries(timetable_id, faculty_id=faculty_id)
        entries.sort(key=lambda e: (e.dayOrder or 0, e.slotOrder or 0))
        return entries

    async def get_master_view(self, timetable_id: str) -> TimetableMasterViewResponse:
        tt = await self.get_by_id(timetable_id)

        working_days = await working_day_repo.find_many({"isActive": True, "isWorkingDay": True})
        working_days.sort(key=lambda d: d.get("dayOrder", 0))

        teaching_slots = await time_slot_repo.find_many({"isActive": True, "isTeachingSlot": True})
        teaching_slots.sort(key=lambda s: s.get("slotOrder", 0))

        classes = await class_repo.find_many({
            "academicYearId": tt.academicYearId,
            "semesterTypeId": tt.semesterTypeId,
            "isActive": True,
        })
        classes.sort(key=lambda c: c.get("name", ""))

        entries = await self.get_entries(timetable_id)

        return TimetableMasterViewResponse(
            timetable=tt,
            classes=classes,
            workingDays=working_days,
            teachingSlots=teaching_slots,
            entries=entries,
        )

    async def delete_timetable(self, timetable_id: str):
        tt = await timetable_repo.get_by_id(timetable_id)
        if not tt:
            raise NotFoundException(f"Timetable with ID '{timetable_id}' not found")

        if tt.get("status") == TimetableStatus.PUBLISHED:
            raise ConflictException("Published timetable cannot be deleted directly. Archive or unpublish first.")

        await timetable_entry_repo.delete_by_timetable_id(timetable_id)
        await timetable_repo.delete_by_id(timetable_id)

    async def _enrich_entries(self, raw_entries: List[Dict[str, Any]]) -> List[TimetableEntryResponse]:
        if not raw_entries:
            return []

        # Batch lookup caches
        class_ids = {e["classId"] for e in raw_entries}
        day_ids = {e["workingDayId"] for e in raw_entries}
        slot_ids = {e["timeSlotId"] for e in raw_entries}
        subject_ids = {e["subjectId"] for e in raw_entries if e.get("subjectId")}
        resource_ids = {e["resourceId"] for e in raw_entries if e.get("resourceId")}
        faculty_ids = {f for e in raw_entries for f in e.get("facultyIds", [])}

        classes = await class_repo.find_many({"_id": {"$in": list(class_ids)}})
        class_map = {c["id"]: c for c in classes}

        days = await working_day_repo.find_many({"_id": {"$in": list(day_ids)}})
        day_map = {d["id"]: d for d in days}

        slots = await time_slot_repo.find_many({"_id": {"$in": list(slot_ids)}})
        slot_map = {s["id"]: s for s in slots}

        subjects = await subject_repo.find_many({"_id": {"$in": list(subject_ids)}}) if subject_ids else []
        subject_map = {s["id"]: s for s in subjects}

        faculty = await faculty_repo.find_many({"_id": {"$in": list(faculty_ids)}}) if faculty_ids else []
        faculty_map = {f["id"]: f for f in faculty}

        resources = await resource_repo.find_many({"_id": {"$in": list(resource_ids)}}) if resource_ids else []
        resource_map = {r["id"]: r for r in resources}

        enriched = []
        for e in raw_entries:
            c = class_map.get(e["classId"], {})
            d = day_map.get(e["workingDayId"], {})
            s = slot_map.get(e["timeSlotId"], {})
            sub = subject_map.get(e.get("subjectId"), {})
            res = resource_map.get(e.get("resourceId"), {})
            fac_names = [faculty_map[fid].get("name", fid) for fid in e.get("facultyIds", []) if fid in faculty_map]

            item = dict(e)
            item["className"] = c.get("name")
            item["classDisplayName"] = c.get("displayName")
            item["dayName"] = d.get("name")
            item["dayOrder"] = d.get("dayOrder")
            item["timeSlotName"] = s.get("name")
            item["startTime"] = s.get("startTime")
            item["endTime"] = s.get("endTime")
            item["slotOrder"] = s.get("slotOrder")
            item["subjectName"] = sub.get("name")
            item["subjectCode"] = sub.get("subjectCode")
            item["facultyNames"] = fac_names
            item["resourceName"] = res.get("name")
            item["resourceCode"] = res.get("code")

            enriched.append(TimetableEntryResponse(**item))

        return enriched


timetable_generation_service = TimetableGenerationService()
