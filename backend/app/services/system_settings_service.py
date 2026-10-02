from datetime import datetime, timezone
from typing import Optional, Dict, Any
from app.repositories.system_settings_repository import system_settings_repository
from app.schemas.system_settings import SystemSettingsResponse, SystemSettingsUpdate, SubstitutionPolicy
from app.services.audit_service import audit_service
from app.utils.logger import get_logger

logger = get_logger(__name__)

DEFAULT_SETTINGS = {
    "defaultTimezone": "UTC",
    "dateFormat": "YYYY-MM-DD",
    "timeFormat": "12h",
    "substitutionPolicies": {
        "allowOvertimeSubstitutes": True,
        "autoNotifySubstitutes": True,
        "requireApprovalForLeave": True,
        "prioritizeSameSubject": True,
    },
    "notificationPreferences": {
        "timetablePublished": True,
        "leaveDecisions": True,
        "substitutionAssigned": True,
        "emergencyAbsences": True,
    },
}


class SystemSettingsService:
    def __init__(self):
        self.repo = system_settings_repository

    async def get_settings(self) -> SystemSettingsResponse:
        doc = await self.repo.get_settings()
        if not doc:
            data = dict(DEFAULT_SETTINGS)
            data["updatedAt"] = datetime.now(timezone.utc)
            data["updatedBy"] = "SYSTEM"
            created = await self.repo.create(data)
            doc = created

        return SystemSettingsResponse(
            id=str(doc.get("id") or doc.get("_id")),
            defaultAcademicYearId=doc.get("defaultAcademicYearId"),
            defaultSemesterTypeId=doc.get("defaultSemesterTypeId"),
            defaultTimezone=doc.get("defaultTimezone", "UTC"),
            dateFormat=doc.get("dateFormat", "YYYY-MM-DD"),
            timeFormat=doc.get("timeFormat", "12h"),
            substitutionPolicies=SubstitutionPolicy(**(doc.get("substitutionPolicies") or DEFAULT_SETTINGS["substitutionPolicies"])),
            notificationPreferences=doc.get("notificationPreferences", DEFAULT_SETTINGS["notificationPreferences"]),
            updatedAt=doc.get("updatedAt").isoformat() if isinstance(doc.get("updatedAt"), datetime) else str(doc.get("updatedAt")) if doc.get("updatedAt") else None,
            updatedBy=doc.get("updatedBy"),
        )

    async def update_settings(
        self,
        update_in: SystemSettingsUpdate,
        current_user: Optional[Dict[str, Any]] = None,
    ) -> SystemSettingsResponse:
        current = await self.get_settings()
        update_dict: Dict[str, Any] = {}

        if update_in.defaultAcademicYearId is not None:
            update_dict["defaultAcademicYearId"] = update_in.defaultAcademicYearId or None
        if update_in.defaultSemesterTypeId is not None:
            update_dict["defaultSemesterTypeId"] = update_in.defaultSemesterTypeId or None
        if update_in.defaultTimezone is not None:
            update_dict["defaultTimezone"] = update_in.defaultTimezone
        if update_in.dateFormat is not None:
            update_dict["dateFormat"] = update_in.dateFormat
        if update_in.timeFormat is not None:
            update_dict["timeFormat"] = update_in.timeFormat
        if update_in.substitutionPolicies is not None:
            update_dict["substitutionPolicies"] = update_in.substitutionPolicies.model_dump()
        if update_in.notificationPreferences is not None:
            update_dict["notificationPreferences"] = update_in.notificationPreferences

        user_name = current_user.get("username") if current_user else "SYSTEM"
        update_dict["updatedBy"] = user_name

        updated = await self.repo.update_by_id(current.id, update_dict)

        await audit_service.log_action(
            action="SYSTEM_SETTINGS_UPDATED",
            entity_type="SystemSettings",
            entity_id=current.id,
            description="System global settings updated",
            user=current_user,
            metadata=update_dict,
        )

        return await self.get_settings()


system_settings_service = SystemSettingsService()
