from typing import Any, Dict, List
from app.repositories.academic_year_repository import academic_year_repo
from app.repositories.class_repository import class_repo
from app.repositories.faculty_allocation_repository import faculty_allocation_repo
from app.schemas.academic_year import AcademicYearCreate, AcademicYearUpdate
from app.utils.exceptions import ConflictException, DependencyException, NotFoundException


class AcademicYearService:
    async def create(self, data: AcademicYearCreate) -> Dict[str, Any]:
        existing = await academic_year_repo.find_by_name(data.name)
        if existing:
            raise ConflictException(f"Academic year with name '{data.name}' already exists")

        payload = data.model_dump()
        if payload.get("isCurrent"):
            await academic_year_repo.unset_all_current()

        return await academic_year_repo.create(payload)

    async def get_by_id(self, id_str: str) -> Dict[str, Any]:
        record = await academic_year_repo.get_by_id(id_str)
        if not record:
            raise NotFoundException(f"Academic year with ID '{id_str}' not found")
        return record

    async def list_all(self) -> List[Dict[str, Any]]:
        return await academic_year_repo.find_many(sort=[("startYear", -1)])

    async def update(self, id_str: str, data: AcademicYearUpdate) -> Dict[str, Any]:
        record = await self.get_by_id(id_str)
        update_dict = data.model_dump(exclude_unset=True)

        if "name" in update_dict and update_dict["name"] != record["name"]:
            duplicate = await academic_year_repo.find_by_name(update_dict["name"])
            if duplicate and duplicate["id"] != id_str:
                raise ConflictException(f"Academic year with name '{update_dict['name']}' already exists")

        if update_dict.get("isCurrent"):
            await academic_year_repo.unset_all_current()

        updated = await academic_year_repo.update_by_id(id_str, update_dict)
        return updated

    async def delete(self, id_str: str) -> bool:
        await self.get_by_id(id_str)

        # Referential dependency check
        class_count = await class_repo.count({"academicYearId": id_str})
        if class_count > 0:
            raise DependencyException(
                f"Academic year cannot be deleted because it is referenced by {class_count} class(es)."
            )

        alloc_count = await faculty_allocation_repo.count({"academicYearId": id_str})
        if alloc_count > 0:
            raise DependencyException(
                f"Academic year cannot be deleted because it is referenced by {alloc_count} faculty allocation(s)."
            )

        return await academic_year_repo.delete_by_id(id_str)

    async def set_current(self, id_str: str) -> Dict[str, Any]:
        await self.get_by_id(id_str)
        updated = await academic_year_repo.set_current(id_str)
        return updated


academic_year_service = AcademicYearService()
