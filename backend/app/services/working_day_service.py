from typing import Any, Dict, List
from app.repositories.working_day_repository import working_day_repo
from app.schemas.working_day import WorkingDayCreate, WorkingDayUpdate
from app.utils.exceptions import ConflictException, NotFoundException


class WorkingDayService:
    async def create(self, data: WorkingDayCreate) -> Dict[str, Any]:
        existing = await working_day_repo.find_by_day_order(data.dayOrder)
        if existing:
            raise ConflictException(f"Working day with dayOrder {data.dayOrder} ({existing['name']}) already exists")
        return await working_day_repo.create(data.model_dump())

    async def get_by_id(self, id_str: str) -> Dict[str, Any]:
        record = await working_day_repo.get_by_id(id_str)
        if not record:
            raise NotFoundException(f"Working day with ID '{id_str}' not found")
        return record

    async def list_all(self) -> List[Dict[str, Any]]:
        # Sort by dayOrder ASC by default
        return await working_day_repo.find_many(sort=[("dayOrder", 1)])

    async def update(self, id_str: str, data: WorkingDayUpdate) -> Dict[str, Any]:
        record = await self.get_by_id(id_str)
        update_dict = data.model_dump(exclude_unset=True)

        if "dayOrder" in update_dict and update_dict["dayOrder"] != record["dayOrder"]:
            duplicate = await working_day_repo.find_by_day_order(update_dict["dayOrder"])
            if duplicate and duplicate["id"] != id_str:
                raise ConflictException(
                    f"Working day with dayOrder {update_dict['dayOrder']} ({duplicate['name']}) already exists"
                )

        return await working_day_repo.update_by_id(id_str, update_dict)

    async def delete(self, id_str: str) -> bool:
        await self.get_by_id(id_str)
        return await working_day_repo.delete_by_id(id_str)


working_day_service = WorkingDayService()
