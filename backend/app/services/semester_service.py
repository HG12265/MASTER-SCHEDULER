from typing import Any, Dict, List, Optional
from app.repositories.programme_repository import programme_repo
from app.repositories.semester_repository import semester_repo
from app.repositories.class_repository import class_repo
from app.repositories.subject_repository import subject_repo
from app.schemas.semester import SemesterCreate, SemesterUpdate
from app.utils.exceptions import BadRequestException, ConflictException, DependencyException, NotFoundException


class SemesterService:
    async def create(self, data: SemesterCreate) -> Dict[str, Any]:
        # Validate programme existence
        programme = await programme_repo.get_by_id(data.programmeId)
        if not programme:
            raise NotFoundException(f"Programme with ID '{data.programmeId}' not found")

        # Validate semester number within total semesters
        if data.semesterNumber > programme["totalSemesters"]:
            raise BadRequestException(
                f"Semester number {data.semesterNumber} exceeds programme '{programme['name']}' maximum total semesters ({programme['totalSemesters']})"
            )

        # Check compound uniqueness: programmeId + semesterNumber
        duplicate = await semester_repo.find_by_programme_and_number(data.programmeId, data.semesterNumber)
        if duplicate:
            raise ConflictException(
                f"Semester {data.semesterNumber} already exists for programme '{programme['name']}'"
            )

        doc = await semester_repo.create(data.model_dump())
        doc["programmeCode"] = programme.get("code")
        return doc

    async def get_by_id(self, id_str: str) -> Dict[str, Any]:
        record = await semester_repo.get_by_id(id_str)
        if not record:
            raise NotFoundException(f"Semester with ID '{id_str}' not found")
        prog = await programme_repo.get_by_id(record["programmeId"])
        if prog:
            record["programmeCode"] = prog.get("code")
        return record

    async def list_semesters(
        self, programme_id: Optional[str] = None, is_active: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        semesters = await semester_repo.list_semesters(programme_id, is_active)
        # Enrich programme code
        programme_map = {}
        for s in semesters:
            pid = s["programmeId"]
            if pid not in programme_map:
                p = await programme_repo.get_by_id(pid)
                programme_map[pid] = p.get("code") if p else None
            s["programmeCode"] = programme_map[pid]
        return semesters

    async def update(self, id_str: str, data: SemesterUpdate) -> Dict[str, Any]:
        record = await self.get_by_id(id_str)
        update_dict = data.model_dump(exclude_unset=True)

        if "semesterNumber" in update_dict and update_dict["semesterNumber"] != record["semesterNumber"]:
            programme = await programme_repo.get_by_id(record["programmeId"])
            if update_dict["semesterNumber"] > programme["totalSemesters"]:
                raise BadRequestException(
                    f"Semester number {update_dict['semesterNumber']} exceeds programme maximum total semesters ({programme['totalSemesters']})"
                )
            duplicate = await semester_repo.find_by_programme_and_number(
                record["programmeId"], update_dict["semesterNumber"]
            )
            if duplicate and duplicate["id"] != id_str:
                raise ConflictException(
                    f"Semester {update_dict['semesterNumber']} already exists for programme '{programme['name']}'"
                )

        updated = await semester_repo.update_by_id(id_str, update_dict)
        prog = await programme_repo.get_by_id(record["programmeId"])
        if prog:
            updated["programmeCode"] = prog.get("code")
        return updated

    async def delete(self, id_str: str) -> bool:
        await self.get_by_id(id_str)

        # Referential dependency check
        class_count = await class_repo.count({"semesterId": id_str})
        if class_count > 0:
            raise DependencyException(
                f"Semester cannot be deleted because it is referenced by {class_count} class(es)."
            )

        sub_count = await subject_repo.count({"semesterId": id_str})
        if sub_count > 0:
            raise DependencyException(
                f"Semester cannot be deleted because it is referenced by {sub_count} subject(s)."
            )

        return await semester_repo.delete_by_id(id_str)


semester_service = SemesterService()
