from fastapi import APIRouter, Depends, status
from app.schemas.user import UserLoginRequest, UserLoginResponse, AuthMeResponse, UserResponse
from app.services.user_service import user_service
from app.middleware.auth import get_current_user
from app.schemas.rbac import get_permissions_for_role
from app.config.settings import get_settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


@router.post("/login", response_model=UserLoginResponse, summary="User Login")
async def login(credentials: UserLoginRequest):
    """
    Authenticate user with email/username and password.
    Returns JWT access token with role and granted permissions.
    """
    auth_result = await user_service.authenticate(credentials.email, credentials.password)
    return UserLoginResponse(
        token=auth_result["token"],
        tokenType="Bearer",
        expiresIn=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=auth_result["user"],
        permissions=auth_result["permissions"],
    )


@router.get("/me", response_model=AuthMeResponse, summary="Get Current Profile")
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get profile and permissions of currently authenticated user.
    """
    user_res = await user_service._format_user(current_user)
    permissions = get_permissions_for_role(user_res.role)
    return AuthMeResponse(
        user=user_res,
        permissions=permissions,
    )
