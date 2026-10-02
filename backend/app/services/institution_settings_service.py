from typing import Any, Dict
from app.repositories.institution_settings_repository import institution_settings_repo
from app.schemas.institution_settings import InstitutionSettingsResponse, InstitutionSettingsUpdate


class InstitutionSettingsService:
    async def get_settings(self) -> InstitutionSettingsResponse:
        data = await institution_settings_repo.get_settings()
        return InstitutionSettingsResponse(**data)

    async def update_settings(self, updates: InstitutionSettingsUpdate, updated_by: str = None) -> InstitutionSettingsResponse:
        payload = updates.model_dump(exclude_unset=True)
        if updated_by:
            payload["updatedBy"] = updated_by
        data = await institution_settings_repo.update_settings(payload)
        return InstitutionSettingsResponse(**data)


institution_settings_service = InstitutionSettingsService()
