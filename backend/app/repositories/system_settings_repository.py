from typing import Optional, Dict, Any
from app.repositories.base_repository import BaseRepository


class SystemSettingsRepository(BaseRepository):
    def __init__(self):
        super().__init__("system_settings")

    async def get_settings(self) -> Optional[Dict[str, Any]]:
        return await self.find_one({})


system_settings_repository = SystemSettingsRepository()
