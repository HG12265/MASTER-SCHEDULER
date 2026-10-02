from typing import Optional, List, Callable
from fastapi import Request, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.security import decode_access_token
from app.repositories.user_repository import user_repository
from app.schemas.rbac import Permission, UserRole, ROLE_PERMISSIONS
from app.utils.logger import get_logger

logger = get_logger(__name__)

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)) -> dict:
    """
    Extract and validate the JWT Bearer token from the request.
    Returns the user document from the database.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload["sub"]
    user = await user_repository.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("isActive", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact an administrator.",
        )

    return user


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> Optional[dict]:
    """
    Optional token extraction. If no token or invalid, returns None without raising.
    """
    if not credentials or not credentials.credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


def require_permission(perm: Permission | str) -> Callable:
    """
    FastAPI dependency factory enforcing a specific permission check.
    """
    perm_val = perm.value if isinstance(perm, Permission) else str(perm)

    async def _perm_checker(current_user: dict = Depends(get_current_user)) -> dict:
        role_str = current_user.get("role", "")
        try:
            user_role = UserRole(role_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Unrecognized role '{role_str}'."
            )

        granted_perms = ROLE_PERMISSIONS.get(user_role, set())
        granted_perm_values = {p.value for p in granted_perms}

        if perm_val not in granted_perm_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Missing required permission: '{perm_val}'."
            )

        return current_user

    return _perm_checker


def require_roles(allowed_roles: List[UserRole | str]) -> Callable:
    """
    FastAPI dependency factory restricting access to a list of allowed roles.
    """
    role_values = {r.value if isinstance(r, UserRole) else str(r) for r in allowed_roles}

    async def _role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role", "")
        if user_role not in role_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Role '{user_role}' is not authorized for this resource."
            )
        return current_user

    return _role_checker
