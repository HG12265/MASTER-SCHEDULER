from typing import Any, Dict, List, Optional
from app.repositories.base_repository import BaseRepository
from app.utils.object_id import parse_object_id, docs_to_list


class TimeSlotRepository(BaseRepository):
    def __init__(self):
        super().__init__("time_slots")

    async def find_by_order(self, slot_order: int) -> Optional[Dict[str, Any]]:
        return await self.find_one({"slotOrder": slot_order, "isActive": True})

    async def find_overlapping(
        self, start_time: str, end_time: str, exclude_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Find any active slots that overlap in time.
        Overlap condition: existing.startTime < new.endTime AND existing.endTime > new.startTime.
        """
        query: Dict[str, Any] = {
            "isActive": True,
            "startTime": {"$lt": end_time},
            "endTime": {"$gt": start_time},
        }
        if exclude_id:
            query["_id"] = {"$ne": parse_object_id(exclude_id, "Time Slot")}

        cursor = self.collection.find(query)
        docs = await cursor.to_list(length=50)
        return docs_to_list(docs)


time_slot_repo = TimeSlotRepository()
