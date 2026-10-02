from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from app.schemas.user import UserCreate, UserUpdate, UserResetPassword, UserResponse
from app.schemas.rbac import Permission, UserRole
from app.services.user_service import user_service
from app.middleware.auth import require_permission, get_current_user

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("", response_model=List[UserResponse], summary="List Users")
async def list_users(
    role: Optional[str] = Query(None, description="Filter by role"),
    isActive: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: dict = Depends(require_permission(Permission.USERS_VIEW)),
):
    """
    List all system user accounts. Requires users.view permission.
    """
    return await user_service.list_users(role=role, is_active=isActive)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Create User")
async def create_user(
    user_in: UserCreate,
    current_user: dict = Depends(require_permission(Permission.USERS_MANAGE)),
):
    """
    Create a new user account with hashed password and assigned role.
    Requires users.manage permission.
    """
    return await user_service.create_user(user_in)


@router.get("/{user_id}", response_model=UserResponse, summary="Get User Details")
async def get_user(
    user_id: str,
    current_user: dict = Depends(require_permission(Permission.USERS_VIEW)),
):
    """
    Get detailed information for a specific user. Requires users.view permission.
    """
    return await user_service.get_by_id(user_id)


@router.put("/{user_id}", response_model=UserResponse, summary="Update User")
async def update_user(
    user_id: str,
    user_in: UserUpdate,
    current_user: dict = Depends(require_permission(Permission.USERS_MANAGE)),
):
    """
    Update user profile, role, or linked faculty. Requires users.manage permission.
    """
    return await user_service.update_user(user_id, user_in)


@router.patch("/{user_id}/activate", response_model=UserResponse, summary="Activate User")
async def activate_user(
    user_id: str,
    current_user: dict = Depends(require_permission(Permission.USERS_MANAGE)),
):
    """
    Activate a user account. Requires users.manage permission.
    """
    return await user_service.set_active_status(user_id, True)


@router.patch("/{user_id}/deactivate", response_model=UserResponse, summary="Deactivate User")
async def deactivate_user(
    user_id: str,
    current_user: dict = Depends(require_permission(Permission.USERS_MANAGE)),
):
    """
    Deactivate a user account. Requires users.manage permission.
    """
    return await user_service.set_active_status(user_id, False)


@router.post("/{user_id}/reset-password", status_code=status.HTTP_200_OK, summary="Reset Password")
async def reset_password(
    user_id: str,
    body: UserResetPassword,
    current_user: dict = Depends(require_permission(Permission.USERS_MANAGE)),
):
    """
    Administrative password reset. Requires users.manage permission.
    """
    await user_service.reset_password(user_id, body.newPassword)
    return {"success": True, "message": "Password successfully reset"}
