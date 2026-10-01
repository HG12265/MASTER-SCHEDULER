from typing import Any, Dict, List
from app.repositories.semester_type_repository import semester_type_repo
from app.repositories.class_repository import class_repo
from app.repositories.faculty_allocation_repository import faculty_allocation_repo
from app.schemas.semester_type import SemesterTypeCreate, SemesterTypeUpdate
from app.utils.exceptions import ConflictException, DependencyException, NotFoundException


class SemesterTypeService:
    async def create(self, data: SemesterTypeCreate) -> Dict[str, Any]:
        existing = await semester_type_repo.find_by_code(data.code)
        if existing:
            raise ConflictException(f"Semester type with code '{data.code}' already exists")
        return await semester_type_repo.create(data.model_dump())

    async def get_by_id(self, id_str: str) -> Dict[str, Any]:
        record = await semester_type_repo.get_by_id(id_str)
        if not record:
            raise NotFoundException(f"Semester type with ID '{id_str}' not found")
        return record

    async def list_all(self) -> List[Dict[str, Any]]:
        return await semester_type_repo.find_many(sort=[("code", 1)])

    async def update(self, id_str: str, data: SemesterTypeUpdate) -> Dict[str, Any]:
        record = await self.get_by_id(id_str)
        update_dict = data.model_dump(exclude_unset=True)

        if "code" in update_dict and update_dict["code"] != record["code"]:
            duplicate = await semester_type_repo.find_by_code(update_dict["code"])
            if duplicate and duplicate["id"] != id_str:
                raise ConflictException(f"Semester type with code '{update_dict['code']}' already exists")

        return await semester_type_repo.update_by_id(id_str, update_dict)

    async def delete(self, id_str: str) -> bool:
        await self.get_by_id(id_str)

        # Referential dependency check
        class_count = await class_repo.count({"semesterTypeId": id_str})
        if class_count > 0:
            raise DependencyException(
                f"Semester type cannot be deleted because it is referenced by {class_count} class(es)."
            )

        alloc_count = await faculty_allocation_repo.count({"semesterTypeId": id_str})
        if alloc_count > 0:
            raise DependencyException(
                f"Semester type cannot be deleted because it is referenced by {alloc_count} faculty allocation(s)."
            )

        return await semester_type_repo.delete_by_id(id_str)


semester_type_service = SemesterTypeService()
