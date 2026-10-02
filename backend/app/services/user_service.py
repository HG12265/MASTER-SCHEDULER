from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from app.repositories.user_repository import user_repository
from app.repositories.faculty_repository import faculty_repository
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.schemas.rbac import UserRole, get_permissions_for_role
from app.utils.security import hash_password, verify_password, create_access_token
from app.utils.exceptions import ConflictException, NotFoundException, BadRequestException, UnauthorizedException
from app.utils.logger import get_logger

logger = get_logger(__name__)


class UserService:
    def __init__(self):
        self.repo = user_repository

    async def _format_user(self, doc: Dict[str, Any]) -> UserResponse:
        faculty_name = None
        if doc.get("facultyId"):
            try:
                fac = await faculty_repository.get_by_id(doc["facultyId"])
                if fac:
                    faculty_name = fac.get("name")
            except Exception:
                pass

        return UserResponse(
            id=str(doc.get("id") or doc.get("_id")),
            username=doc.get("username", ""),
            email=doc.get("email", ""),
            role=doc.get("role", UserRole.FACULTY.value),
            facultyId=doc.get("facultyId"),
            facultyName=faculty_name,
            isActive=doc.get("isActive", True),
            lastLoginAt=doc.get("lastLoginAt").isoformat() if isinstance(doc.get("lastLoginAt"), datetime) else str(doc.get("lastLoginAt")) if doc.get("lastLoginAt") else None,
            passwordChangedAt=doc.get("passwordChangedAt").isoformat() if isinstance(doc.get("passwordChangedAt"), datetime) else str(doc.get("passwordChangedAt")) if doc.get("passwordChangedAt") else None,
            createdAt=doc.get("createdAt").isoformat() if isinstance(doc.get("createdAt"), datetime) else str(doc.get("createdAt")) if doc.get("createdAt") else None,
            updatedAt=doc.get("updatedAt").isoformat() if isinstance(doc.get("updatedAt"), datetime) else str(doc.get("updatedAt")) if doc.get("updatedAt") else None,
        )

    async def list_users(self, role: Optional[str] = None, is_active: Optional[bool] = None) -> List[UserResponse]:
        query = {}
        if role:
            query["role"] = role
        if is_active is not None:
            query["isActive"] = is_active

        docs = await self.repo.find_many(query, sort=[("createdAt", -1)])
        return [await self._format_user(d) for d in docs]

    async def get_by_id(self, user_id: str) -> UserResponse:
        doc = await self.repo.get_by_id(user_id)
        if not doc:
            raise NotFoundException("User", user_id)
        return await self._format_user(doc)

    async def create_user(self, user_in: UserCreate) -> UserResponse:
        # Check duplicate email
        existing_email = await self.repo.get_by_email(user_in.email)
        if existing_email:
            raise ConflictException(f"User with email '{user_in.email}' already exists")

        # Check duplicate username
        existing_username = await self.repo.get_by_username(user_in.username)
        if existing_username:
            raise ConflictException(f"Username '{user_in.username}' is already taken")

        # If facultyId provided, verify it exists
        if user_in.facultyId:
            fac = await faculty_repository.get_by_id(user_in.facultyId)
            if not fac:
                raise NotFoundException("Faculty", user_in.facultyId)

        data = {
            "username": user_in.username.strip(),
            "email": user_in.email.lower().strip(),
            "passwordHash": hash_password(user_in.password),
            "role": user_in.role.value if isinstance(user_in.role, UserRole) else str(user_in.role),
            "facultyId": user_in.facultyId,
            "isActive": user_in.isActive,
            "lastLoginAt": None,
            "passwordChangedAt": datetime.now(timezone.utc),
        }

        created = await self.repo.create(data)
        logger.info("Created user %s (role: %s)", created["username"], created["role"])
        return await self._format_user(created)

    async def update_user(self, user_id: str, user_in: UserUpdate) -> UserResponse:
        doc = await self.repo.get_by_id(user_id)
        if not doc:
            raise NotFoundException("User", user_id)

        update_dict = {}
        if user_in.username is not None and user_in.username != doc.get("username"):
            existing_username = await self.repo.get_by_username(user_in.username)
            if existing_username and str(existing_username.get("id")) != user_id:
                raise ConflictException(f"Username '{user_in.username}' is already taken")
            update_dict["username"] = user_in.username.strip()

        if user_in.email is not None and user_in.email.lower().strip() != doc.get("email"):
            existing_email = await self.repo.get_by_email(user_in.email)
            if existing_email and str(existing_email.get("id")) != user_id:
                raise ConflictException(f"User with email '{user_in.email}' already exists")
            update_dict["email"] = user_in.email.lower().strip()

        if user_in.role is not None:
            update_dict["role"] = user_in.role.value if isinstance(user_in.role, UserRole) else str(user_in.role)

        if user_in.facultyId is not None:
            if user_in.facultyId != "":
                fac = await faculty_repository.get_by_id(user_in.facultyId)
                if not fac:
                    raise NotFoundException("Faculty", user_in.facultyId)
                update_dict["facultyId"] = user_in.facultyId
            else:
                update_dict["facultyId"] = None

        if user_in.isActive is not None:
            update_dict["isActive"] = user_in.isActive

        updated = await self.repo.update_by_id(user_id, update_dict)
        return await self._format_user(updated)

    async def set_active_status(self, user_id: str, is_active: bool) -> UserResponse:
        doc = await self.repo.get_by_id(user_id)
        if not doc:
            raise NotFoundException("User", user_id)
        updated = await self.repo.set_active(user_id, is_active)
        return await self._format_user(updated)

    async def reset_password(self, user_id: str, new_password: str) -> None:
        doc = await self.repo.get_by_id(user_id)
        if not doc:
            raise NotFoundException("User", user_id)
        if len(new_password) < 6:
            raise BadRequestException("Password must be at least 6 characters long")

        await self.repo.update_by_id(user_id, {
            "passwordHash": hash_password(new_password),
            "passwordChangedAt": datetime.now(timezone.utc),
        })
        logger.info("Password reset for user %s", user_id)

    async def authenticate(self, username_or_email: str, password: str) -> Dict[str, Any]:
        term = username_or_email.lower().strip()
        doc = await self.repo.get_by_email(term)
        if not doc:
            doc = await self.repo.get_by_username(username_or_email.strip())

        if not doc:
            raise UnauthorizedException("Invalid credentials")

        if not doc.get("isActive", True):
            raise UnauthorizedException("This account is currently deactivated. Contact your administrator.")

        password_hash = doc.get("passwordHash", "")
        if not verify_password(password, password_hash):
            raise UnauthorizedException("Invalid credentials")

        now = datetime.now(timezone.utc)
        await self.repo.update_by_id(doc["id"], {"lastLoginAt": now})

        role = doc.get("role", UserRole.FACULTY.value)
        permissions = get_permissions_for_role(role)

        token_payload = {
            "sub": str(doc["id"]),
            "username": doc.get("username"),
            "email": doc.get("email"),
            "role": role,
            "facultyId": doc.get("facultyId"),
        }

        token = create_access_token(token_payload)
        user_res = await self._format_user(doc)

        return {
            "token": token,
            "user": user_res,
            "permissions": permissions,
        }

    async def seed_default_admin(self) -> None:
        """Seed a default SUPER_ADMIN user if no user exists in the database."""
        count = await self.repo.count()
        if count == 0:
            logger.info("No users found. Seeding default SUPER_ADMIN account...")
            default_admin = UserCreate(
                username="admin",
                email="admin@university.edu",
                password="adminpassword",
                role=UserRole.SUPER_ADMIN,
                isActive=True,
            )
            await self.create_user(default_admin)
            logger.info("Default SUPER_ADMIN seeded: admin@university.edu")


user_service = UserService()
