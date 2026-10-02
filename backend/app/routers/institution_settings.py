from fastapi import APIRouter, status
from app.schemas.common import DataResponse
from app.schemas.institution_settings import InstitutionSettingsResponse, InstitutionSettingsUpdate
from app.services.institution_settings_service import institution_settings_service

router = APIRouter(prefix="/institution-settings", tags=["Institution Header Settings"])


@router.get("", response_model=DataResponse[InstitutionSettingsResponse], summary="Get Institution Settings")
async def get_institution_settings():
    settings = await institution_settings_service.get_settings()
    return DataResponse(message="Institution settings retrieved successfully", data=settings)


@router.put("", response_model=DataResponse[InstitutionSettingsResponse], summary="Update Institution Settings")
async def update_institution_settings(payload: InstitutionSettingsUpdate):
    settings = await institution_settings_service.update_settings(payload)
    return DataResponse(message="Institution settings updated successfully", data=settings)
