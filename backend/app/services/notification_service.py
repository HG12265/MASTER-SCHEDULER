from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from app.repositories.notification_repository import notification_repository
from app.repositories.user_repository import user_repository
from app.schemas.notification import NotificationCreate, NotificationResponse
from app.services.email_service import email_service
from app.utils.logger import get_logger

logger = get_logger(__name__)


class NotificationService:
    def __init__(self):
        self.repo = notification_repository

    async def _format_notification(self, doc: Dict[str, Any]) -> NotificationResponse:
        return NotificationResponse(
            id=str(doc.get("id") or doc.get("_id")),
            userId=str(doc.get("userId", "")),
            type=doc.get("type", "GENERAL"),
            title=doc.get("title", ""),
            message=doc.get("message", ""),
            relatedEntityType=doc.get("relatedEntityType"),
            relatedEntityId=str(doc.get("relatedEntityId")) if doc.get("relatedEntityId") else None,
            isRead=doc.get("isRead", False),
            readAt=doc.get("readAt").isoformat() if isinstance(doc.get("readAt"), datetime) else str(doc.get("readAt")) if doc.get("readAt") else None,
            createdAt=doc.get("createdAt").isoformat() if isinstance(doc.get("createdAt"), datetime) else str(doc.get("createdAt")),
        )

    async def notify_user(
        self,
        user_id: str,
        notif_type: str,
        title: str,
        message: str,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[str] = None,
        send_email_copy: bool = False,
    ) -> Optional[NotificationResponse]:
        """
        Create an in-app notification for a given user.
        Optionally dispatches email if configured and user has email.
        """
        try:
            data = {
                "userId": user_id,
                "type": notif_type,
                "title": title,
                "message": message,
                "relatedEntityType": related_entity_type,
                "relatedEntityId": related_entity_id,
                "isRead": False,
                "readAt": None,
            }
            created = await self.repo.create(data)

            if send_email_copy:
                user_doc = await user_repository.get_by_id(user_id)
                if user_doc and user_doc.get("email"):
                    await email_service.send_email(
                        to_email=user_doc["email"],
                        subject=f"[Master Scheduler] {title}",
                        html_content=f"<p>{message}</p>",
                        text_content=message,
                    )

            return await self._format_notification(created)
        except Exception as e:
            logger.warning("Failed to create notification for user %s: %s", user_id, e)
            return None

    async def notify_faculty(
        self,
        faculty_id: str,
        notif_type: str,
        title: str,
        message: str,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[str] = None,
    ) -> Optional[NotificationResponse]:
        """
        Helper to notify a faculty member by finding their linked user account.
        """
        user_doc = await user_repository.get_by_faculty_id(faculty_id)
        if user_doc:
            user_id = str(user_doc.get("id") or user_doc.get("_id"))
            return await self.notify_user(
                user_id=user_id,
                notif_type=notif_type,
                title=title,
                message=message,
                related_entity_type=related_entity_type,
                related_entity_id=related_entity_id,
                send_email_copy=True,
            )
        return None

    async def notify_all_admins(
        self,
        notif_type: str,
        title: str,
        message: str,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[str] = None,
    ) -> int:
        """
        Send notification to all SUPER_ADMIN and ADMIN accounts.
        """
        admin_users = await user_repository.find_many(
            {"role": {"$in": ["SUPER_ADMIN", "ADMIN"]}, "isActive": True}
        )
        count = 0
        for u in admin_users:
            uid = str(u.get("id") or u.get("_id"))
            await self.notify_user(
                user_id=uid,
                notif_type=notif_type,
                title=title,
                message=message,
                related_entity_type=related_entity_type,
                related_entity_id=related_entity_id,
            )
            count += 1
        return count

    async def get_user_notifications(self, user_id: str, limit: int = 50) -> List[NotificationResponse]:
        docs = await self.repo.get_user_notifications(user_id, limit=limit)
        return [await self._format_notification(d) for d in docs]

    async def get_unread_count(self, user_id: str) -> int:
        return await self.repo.get_unread_count(user_id)

    async def mark_as_read(self, notif_id: str, user_id: str) -> bool:
        doc = await self.repo.get_by_id(notif_id)
        if not doc or str(doc.get("userId")) != user_id:
            return False
        await self.repo.update_by_id(notif_id, {
            "isRead": True,
            "readAt": datetime.now(timezone.utc),
        })
        return True

    async def mark_all_as_read(self, user_id: str) -> int:
        return await self.repo.mark_all_as_read(user_id)


notification_service = NotificationService()
