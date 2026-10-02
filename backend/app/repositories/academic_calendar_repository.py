from typing import Optional, Dict, Any, List
from app.repositories.base_repository import BaseRepository


class AcademicCalendarRepository(BaseRepository):
    def __init__(self):
        super().__init__("academic_calendar_exceptions")

    async def get_by_date(self, date_str: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"date": date_str})

    async def get_by_academic_year(self, academic_year_id: str) -> List[Dict[str, Any]]:
        return await self.find_many({"academicYearId": academic_year_id}, sort=[("date", 1)])


academic_calendar_repository = AcademicCalendarRepository()
