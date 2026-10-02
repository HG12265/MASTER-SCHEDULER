from typing import List, Dict, Any, Optional
from app.repositories.base_repository import BaseRepository


class AuditLogRepository(BaseRepository):
    def __init__(self):
        super().__init__("audit_logs")


audit_log_repository = AuditLogRepository()
