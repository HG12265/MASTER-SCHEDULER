from typing import Any, Dict, List
from app.repositories.time_slot_repository import time_slot_repo
from app.schemas.time_slot import TimeSlotCreate, TimeSlotUpdate
from app.utils.exceptions import ConflictException, NotFoundException


class TimeSlotService:
    async def create(self, data: TimeSlotCreate) -> Dict[str, Any]:
        # Check slotOrder uniqueness
        order_conflict = await time_slot_repo.find_by_order(data.slotOrder)
        if order_conflict:
            raise ConflictException(
                f"Time slot with slotOrder {data.slotOrder} ({order_conflict['name']}) already exists"
            )

        # Check overlapping time intervals among active slots
        overlapping = await time_slot_repo.find_overlapping(data.startTime, data.endTime)
        if overlapping:
            conflict_names = ", ".join(f"'{o['name']}' ({o['startTime']}-{o['endTime']})" for o in overlapping)
            raise ConflictException(
                f"Time slot ({data.startTime}-{data.endTime}) overlaps with existing active slot(s): {conflict_names}"
            )

        return await time_slot_repo.create(data.model_dump())

    async def get_by_id(self, id_str: str) -> Dict[str, Any]:
        record = await time_slot_repo.get_by_id(id_str)
        if not record:
            raise NotFoundException(f"Time slot with ID '{id_str}' not found")
        return record

    async def list_all(self) -> List[Dict[str, Any]]:
        # Sort by slotOrder ASC by default
        return await time_slot_repo.find_many(sort=[("slotOrder", 1)])

    async def update(self, id_str: str, data: TimeSlotUpdate) -> Dict[str, Any]:
        record = await self.get_by_id(id_str)
        update_dict = data.model_dump(exclude_unset=True)

        new_order = update_dict.get("slotOrder", record["slotOrder"])
        if new_order != record["slotOrder"]:
            order_conflict = await time_slot_repo.find_by_order(new_order)
            if order_conflict and order_conflict["id"] != id_str:
                raise ConflictException(
                    f"Time slot with slotOrder {new_order} ({order_conflict['name']}) already exists"
                )

        new_start = update_dict.get("startTime", record["startTime"])
        new_end = update_dict.get("endTime", record["endTime"])

        if new_start != record["startTime"] or new_end != record["endTime"]:
            overlapping = await time_slot_repo.find_overlapping(new_start, new_end, exclude_id=id_str)
            if overlapping:
                conflict_names = ", ".join(f"'{o['name']}' ({o['startTime']}-{o['endTime']})" for o in overlapping)
                raise ConflictException(
                    f"Updated time slot ({new_start}-{new_end}) overlaps with existing active slot(s): {conflict_names}"
                )

        return await time_slot_repo.update_by_id(id_str, update_dict)

    async def delete(self, id_str: str) -> bool:
        await self.get_by_id(id_str)
        return await time_slot_repo.delete_by_id(id_str)


time_slot_service = TimeSlotService()
