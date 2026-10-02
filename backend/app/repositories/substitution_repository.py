from typing import List, Dict, Any, Optional
from app.repositories.base_repository import BaseRepository


class SubstitutionRepository(BaseRepository):
    def __init__(self):
        super().__init__("substitutions")

    async def get_by_date_and_entry(self, date_str: str, entry_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({
            "date": date_str,
            "originalEntryId": entry_id,
            "status": {"$in": ["ASSIGNED", "PROPOSED"]},
        })

    async def get_for_date(self, date_str: str) -> List[Dict[str, Any]]:
        return await self.find_many({"date": date_str}, sort=[("timeSlotId", 1)])

    async def get_active_substitutions_for_faculty(self, faculty_id: str, date_str: str) -> List[Dict[str, Any]]:
        return await self.find_many({
            "substituteFacultyId": faculty_id,
            "date": date_str,
            "status": "ASSIGNED",
        })


substitution_repository = SubstitutionRepository()
