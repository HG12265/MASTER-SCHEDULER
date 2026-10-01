from typing import Any, Dict, Optional
from datetime import datetime, timezone
from app.repositories.base_repository import BaseRepository
from app.utils.object_id import parse_object_id, doc_to_dict


class AcademicYearRepository(BaseRepository):
    def __init__(self):
        super().__init__("academic_years")

    async def find_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"name": name})

    async def unset_all_current(self) -> None:
        """Unset isCurrent flag on all academic year records."""
        now = datetime.now(timezone.utc)
        await self.collection.update_many(
            {"isCurrent": True},
            {"$set": {"isCurrent": False, "updatedAt": now}},
        )

    async def set_current(self, id_str: str) -> Optional[Dict[str, Any]]:
        """Set specified academic year as current, unsetting others."""
        await self.unset_all_current()
        return await self.update_by_id(id_str, {"isCurrent": True})

    async def get_current(self) -> Optional[Dict[str, Any]]:
        return await self.find_one({"isCurrent": True, "isActive": True})


academic_year_repo = AcademicYearRepository()
