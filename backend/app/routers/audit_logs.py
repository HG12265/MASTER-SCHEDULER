from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from app.schemas.audit_log import AuditLogResponse
from app.schemas.rbac import Permission
from app.services.audit_service import audit_service
from app.middleware.auth import require_permission

router = APIRouter(prefix="/audit-logs", tags=["Audit Logging"])


@router.get("", response_model=List[AuditLogResponse], summary="List System Audit Logs")
async def list_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action name"),
    entityType: Optional[str] = Query(None, description="Filter by entity type"),
    userId: Optional[str] = Query(None, description="Filter by user ID"),
    startDate: Optional[str] = Query(None, description="Filter start date ISO string"),
    endDate: Optional[str] = Query(None, description="Filter end date ISO string"),
    limit: int = Query(200, ge=1, le=1000, description="Max logs to return"),
    current_user: dict = Depends(require_permission(Permission.AUDIT_VIEW)),
):
    """
    Retrieve immutable system audit logs. Requires audit.view permission.
    """
    return await audit_service.list_logs(
        action=action,
        entity_type=entityType,
        user_id=userId,
        start_date=startDate,
        end_date=endDate,
        limit=limit,
    )
