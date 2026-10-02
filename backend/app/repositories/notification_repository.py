from typing import List, Dict, Any
from app.repositories.base_repository import BaseRepository


class NotificationRepository(BaseRepository):
    def __init__(self):
        super().__init__("notifications")

    async def get_user_notifications(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        return await self.find_many(
            {"userId": user_id},
            sort=[("createdAt", -1)],
            limit=limit,
        )

    async def get_unread_count(self, user_id: str) -> int:
        return await self.count({"userId": user_id, "isRead": False})

    async def mark_all_as_read(self, user_id: str) -> int:
        from datetime import datetime, timezone
        result = await self.collection.update_many(
            {"userId": user_id, "isRead": False},
            {"$set": {"isRead": True, "readAt": datetime.now(timezone.utc)}},
        )
        return result.modified_count


notification_repository = NotificationRepository()
