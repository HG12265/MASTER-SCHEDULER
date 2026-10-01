from typing import Any, Dict, List, Optional
from app.repositories.subject_repository import subject_repo
from app.repositories.programme_repository import programme_repo
from app.repositories.semester_repository import semester_repo
from app.repositories.faculty_allocation_repository import faculty_allocation_repo
from app.schemas.subject import SubjectCreate, SubjectUpdate
from app.utils.exceptions import BadRequestException, ConflictException, DependencyException, NotFoundException


class SubjectService:
    async def _validate_programme_and_semester(self, programme_id: str, semester_id: str) -> None:
        prog = await programme_repo.get_by_id(programme_id)
        if not prog:
            raise NotFoundException(f"Programme with ID '{programme_id}' not found")

        sem = await semester_repo.get_by_id(semester_id)
        if not sem:
            raise NotFoundException(f"Semester with ID '{semester_id}' not found")

        if sem["programmeId"] != programme_id:
            raise BadRequestException(
                f"Selected semester '{sem['name']}' does not belong to programme '{prog['name']}'"
            )

    async def _enrich_subject(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        if not doc:
            return doc
        p = await programme_repo.get_by_id(doc["programmeId"])
        s = await semester_repo.get_by_id(doc["semesterId"])
        doc["programmeName"] = p.get("name") if p else None
        doc["semesterName"] = s.get("name") if s else None
        return doc

    async def create(self, data: SubjectCreate) -> Dict[str, Any]:
        await self._validate_programme_and_semester(data.programmeId, data.semesterId)

        # Subject code uniqueness
        existing = await subject_repo.find_by_code(data.subjectCode)
        if existing:
            raise ConflictException(f"Subject with code '{data.subjectCode}' already exists")

        doc = await subject_repo.create(data.model_dump())
        return await self._enrich_subject(doc)

    async def get_by_id(self, id_str: str) -> Dict[str, Any]:
        record = await subject_repo.get_by_id(id_str)
        if not record:
            raise NotFoundException(f"Subject with ID '{id_str}' not found")
        return await self._enrich_subject(record)

    async def list_subjects(
        self,
        programme_id: Optional[str] = None,
        semester_id: Optional[str] = None,
        subject_type: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 10,
    ) -> Dict[str, Any]:
        skip = (page - 1) * limit
        items = await subject_repo.search_subjects(
            programme_id, semester_id, subject_type, is_active, search, skip, limit
        )
        total = await subject_repo.count_subjects(
            programme_id, semester_id, subject_type, is_active, search
        )
        total_pages = (total + limit - 1) // limit if limit > 0 else 1

        enriched_items = [await self._enrich_subject(item) for item in items]

        return {
            "items": enriched_items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
            },
        }

    async def update(self, id_str: str, data: SubjectUpdate) -> Dict[str, Any]:
        record = await self.get_by_id(id_str)
        update_dict = data.model_dump(exclude_unset=True)

        prog_id = update_dict.get("programmeId", record["programmeId"])
        sem_id = update_dict.get("semesterId", record["semesterId"])

        if "programmeId" in update_dict or "semesterId" in update_dict:
            await self._validate_programme_and_semester(prog_id, sem_id)

        if "subjectCode" in update_dict and update_dict["subjectCode"] != record["subjectCode"]:
            dup = await subject_repo.find_by_code(update_dict["subjectCode"])
            if dup and dup["id"] != id_str:
                raise ConflictException(f"Subject with code '{update_dict['subjectCode']}' already exists")

        updated = await subject_repo.update_by_id(id_str, update_dict)
        return await self._enrich_subject(updated)

    async def delete(self, id_str: str) -> bool:
        await self.get_by_id(id_str)

        # Referential dependency check
        alloc_count = await faculty_allocation_repo.count({"subjectId": id_str})
        if alloc_count > 0:
            raise DependencyException(
                f"Subject cannot be deleted because it is allocated in {alloc_count} class schedule assignment(s)."
            )

        return await subject_repo.delete_by_id(id_str)


subject_service = SubjectService()
