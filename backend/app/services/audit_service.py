from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from app.repositories.audit_log_repository import audit_log_repository
from app.schemas.audit_log import AuditLogCreate, AuditLogResponse
from app.utils.logger import get_logger

logger = get_logger(__name__)

SENSITIVE_KEYS = {
    "password", "passwordhash", "newpassword", "oldpassword",
    "token", "jwt", "secret", "authorization", "key", "apikey",
    "mongodb_url", "smtp_password"
}


def sanitize_metadata(meta: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Sanitize metadata recursively to remove sensitive fields."""
    if not meta:
        return None
    cleaned = {}
    for k, v in meta.items():
        if k.lower() in SENSITIVE_KEYS:
            cleaned[k] = "[REDACTED]"
        elif isinstance(v, dict):
            cleaned[k] = sanitize_metadata(v)
        else:
            cleaned[k] = v
    return cleaned


class AuditService:
    def __init__(self):
        self.repo = audit_log_repository

    async def log_action(
        self,
        action: str,
        entity_type: str,
        description: str,
        entity_id: Optional[str] = None,
        user: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Record an immutable system audit entry.
        """
        try:
            user_id = str(user.get("id") or user.get("_id")) if user else None
            username = user.get("username") if user else "SYSTEM"

            data = {
                "userId": user_id,
                "username": username,
                "action": action,
                "entityType": entity_type,
                "entityId": str(entity_id) if entity_id else None,
                "description": description,
                "metadata": sanitize_metadata(metadata),
                "ipAddress": ip_address,
                "userAgent": user_agent,
            }

            created = await self.repo.create(data)
            return created
        except Exception as e:
            logger.warning("Failed to write audit log for action %s: %s", action, e)
            return None

    async def list_logs(
        self,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        user_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 200,
    ) -> List[AuditLogResponse]:
        query: Dict[str, Any] = {}
        if action:
            query["action"] = action
        if entity_type:
            query["entityType"] = entity_type
        if user_id:
            query["userId"] = user_id

        if start_date or end_date:
            date_filter: Dict[str, Any] = {}
            if start_date:
                try:
                    date_filter["$gte"] = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
                except Exception:
                    pass
            if end_date:
                try:
                    date_filter["$lte"] = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                except Exception:
                    pass
            if date_filter:
                query["createdAt"] = date_filter

        docs = await self.repo.find_many(query, sort=[("createdAt", -1)], limit=limit)
        results = []
        for d in docs:
            results.append(
                AuditLogResponse(
                    id=str(d.get("id") or d.get("_id")),
                    userId=d.get("userId"),
                    username=d.get("username"),
                    action=d.get("action", ""),
                    entityType=d.get("entityType", ""),
                    entityId=d.get("entityId"),
                    description=d.get("description", ""),
                    metadata=d.get("metadata"),
                    ipAddress=d.get("ipAddress"),
                    userAgent=d.get("userAgent"),
                    createdAt=d.get("createdAt").isoformat() if isinstance(d.get("createdAt"), datetime) else str(d.get("createdAt")),
                )
            )
        return results


audit_service = AuditService()
