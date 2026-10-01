from typing import Any, Dict, List, Optional
from app.repositories.programme_repository import programme_repo
from app.repositories.semester_repository import semester_repo
from app.repositories.class_repository import class_repo
from app.repositories.subject_repository import subject_repo
from app.schemas.programme import ProgrammeCreate, ProgrammeUpdate
from app.utils.exceptions import ConflictException, DependencyException, NotFoundException


class ProgrammeService:
    async def create(self, data: ProgrammeCreate) -> Dict[str, Any]:
        existing = await programme_repo.find_by_code(data.code)
        if existing:
            raise ConflictException(f"Programme with code '{data.code}' already exists")
        return await programme_repo.create(data.model_dump())

    async def get_by_id(self, id_str: str) -> Dict[str, Any]:
        record = await programme_repo.get_by_id(id_str)
        if not record:
            raise NotFoundException(f"Programme with ID '{id_str}' not found")
        return record

    async def list_programmes(
        self,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        page: int = 1,
        limit: int = 10,
    ) -> Dict[str, Any]:
        skip = (page - 1) * limit
        items = await programme_repo.search_programmes(search, is_active, skip, limit)
        total = await programme_repo.count_programmes(search, is_active)
        total_pages = (total + limit - 1) // limit if limit > 0 else 1

        return {
            "items": items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
            },
        }

    async def update(self, id_str: str, data: ProgrammeUpdate) -> Dict[str, Any]:
        record = await self.get_by_id(id_str)
        update_dict = data.model_dump(exclude_unset=True)

        if "code" in update_dict and update_dict["code"] != record["code"]:
            duplicate = await programme_repo.find_by_code(update_dict["code"])
            if duplicate and duplicate["id"] != id_str:
                raise ConflictException(f"Programme with code '{update_dict['code']}' already exists")

        return await programme_repo.update_by_id(id_str, update_dict)

    async def delete(self, id_str: str) -> bool:
        await self.get_by_id(id_str)

        # Referential dependency checks
        sem_count = await semester_repo.count({"programmeId": id_str})
        if sem_count > 0:
            raise DependencyException(
                f"Programme cannot be deleted because it is referenced by {sem_count} semester(s)."
            )

        class_count = await class_repo.count({"programmeId": id_str})
        if class_count > 0:
            raise DependencyException(
                f"Programme cannot be deleted because it is referenced by {class_count} class(es)."
            )

        sub_count = await subject_repo.count({"programmeId": id_str})
        if sub_count > 0:
            raise DependencyException(
                f"Programme cannot be deleted because it is referenced by {sub_count} subject(s)."
            )

        return await programme_repo.delete_by_id(id_str)


programme_service = ProgrammeService()
