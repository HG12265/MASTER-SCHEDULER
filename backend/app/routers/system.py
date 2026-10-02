from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, Form, Response, status
from fastapi.responses import StreamingResponse
import io
from app.schemas.system_settings import SystemSettingsResponse, SystemSettingsUpdate
from app.schemas.integrity import IntegrityCheckResult
from app.schemas.backup import (
    BackupValidationResult,
    BackupPreviewResponse,
    BackupHistoryItem,
)
from app.schemas.rbac import Permission
from app.services.system_settings_service import system_settings_service
from app.services.integrity_service import database_integrity_service
from app.services.backup_service import backup_service
from app.middleware.auth import require_permission, get_current_user

router = APIRouter(prefix="/system", tags=["System & Maintenance"])


# ====================================================
# SYSTEM SETTINGS
# ====================================================

@router.get("/settings", response_model=SystemSettingsResponse, summary="Get System Settings")
async def get_system_settings():
    """
    Get global system configuration settings.
    """
    return await system_settings_service.get_settings()


@router.put("/settings", response_model=SystemSettingsResponse, summary="Update System Settings")
async def update_system_settings(
    settings_in: SystemSettingsUpdate,
    current_user: dict = Depends(require_permission(Permission.SETTINGS_MANAGE)),
):
    """
    Update global system configuration. Requires settings.manage permission.
    """
    return await system_settings_service.update_settings(settings_in, current_user=current_user)


# ====================================================
# DATABASE INTEGRITY CHECK
# ====================================================

@router.post("/integrity-check", response_model=IntegrityCheckResult, summary="Run Database Integrity Check")
async def run_integrity_check(
    current_user: dict = Depends(require_permission(Permission.SETTINGS_MANAGE)),
):
    """
    Scan collections for broken references, missing relationships, and orphan entries.
    Non-destructive diagnostic tool.
    """
    return await database_integrity_service.run_integrity_check()


# ====================================================
# BACKUP EXPORT & RESTORE
# ====================================================

@router.post("/backups/export", summary="Export Database Backup")
async def export_backup(
    current_user: dict = Depends(require_permission(Permission.BACKUP_MANAGE)),
):
    """
    Export all academic structure, timetable entries, and operational records as a versioned ZIP archive.
    Excludes sensitive authentication secrets.
    """
    zip_bytes, filename = await backup_service.export_backup(current_user=current_user)
    return StreamingResponse(
        io.BytesIO(zip_bytes),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/backups/validate", response_model=BackupValidationResult, summary="Validate Backup File")
async def validate_backup(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_permission(Permission.BACKUP_MANAGE)),
):
    """
    Inspect an uploaded backup archive for schema compliance and JSON validity.
    Does NOT modify the database.
    """
    content = await file.read()
    _, _, result = backup_service.parse_and_validate_zip(content)
    return result


@router.post("/backups/preview", response_model=BackupPreviewResponse, summary="Preview Restore Impact")
async def preview_restore(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_permission(Permission.BACKUP_MANAGE)),
):
    """
    Preview record additions, updates, and potential warnings from an uploaded backup.
    Does NOT modify the database.
    """
    content = await file.read()
    return await backup_service.preview_restore(content)


@router.post("/backups/restore", summary="Safe Restore Backup")
async def restore_backup(
    file: UploadFile = File(...),
    confirm: bool = Form(False),
    current_user: dict = Depends(require_permission(Permission.BACKUP_MANAGE)),
):
    """
    Perform safe MERGE restore from validated backup. Requires explicit confirm=true flag.
    """
    content = await file.read()
    return await backup_service.restore_backup(content, confirm=confirm, current_user=current_user)


@router.get("/backups/history", response_model=List[BackupHistoryItem], summary="Get Backup History")
async def get_backup_history(
    current_user: dict = Depends(require_permission(Permission.BACKUP_MANAGE)),
):
    """
    List metadata records of previously generated backup exports.
    """
    return await backup_service.list_history()
