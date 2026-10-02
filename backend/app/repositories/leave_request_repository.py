from typing import List, Dict, Any, Optional
from app.repositories.base_repository import BaseRepository


class LeaveRequestRepository(BaseRepository):
    def __init__(self):
        super().__init__("faculty_leave_requests")

    async def get_by_faculty(self, faculty_id: str) -> List[Dict[str, Any]]:
        return await self.find_many({"facultyId": faculty_id}, sort=[("startDate", -1)])

    async def get_active_approved_leaves_for_date(self, target_date: str) -> List[Dict[str, Any]]:
        """
        Find all approved leaves that cover a specific date string (YYYY-MM-DD).
        """
        return await self.find_many({
            "status": "APPROVED",
            "startDate": {"$lte": target_date},
            "endDate": {"$gte": target_date},
            "isActive": True,
        })


leave_request_repository = LeaveRequestRepository()
