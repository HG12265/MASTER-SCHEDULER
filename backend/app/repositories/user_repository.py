from typing import Optional, Dict, Any, List
from app.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository):
    def __init__(self):
        super().__init__("users")

    async def get_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"username": username})

    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"email": email.lower().strip()})

    async def get_by_faculty_id(self, faculty_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"facultyId": faculty_id})


user_repository = UserRepository()
