from typing import Any, Dict, Optional
from app.repositories.base_repository import BaseRepository


class SemesterTypeRepository(BaseRepository):
    def __init__(self):
        super().__init__("semester_types")

    async def find_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"code": code.upper()})


semester_type_repo = SemesterTypeRepository()
