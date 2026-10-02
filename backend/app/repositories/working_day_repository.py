from typing import Any, Dict, Optional
from app.repositories.base_repository import BaseRepository


class WorkingDayRepository(BaseRepository):
    def __init__(self):
        super().__init__("working_days")

    async def find_by_day_order(self, day_order: int) -> Optional[Dict[str, Any]]:
        return await self.find_one({"dayOrder": day_order, "isActive": True})


working_day_repo = WorkingDayRepository()
working_day_repository = working_day_repo

