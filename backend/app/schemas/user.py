from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from app.schemas.rbac import UserRole


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    role: UserRole = UserRole.FACULTY
    facultyId: Optional[str] = None
    isActive: bool = True


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    role: UserRole = UserRole.FACULTY
    facultyId: Optional[str] = None
    isActive: bool = True


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    facultyId: Optional[str] = None
    isActive: Optional[bool] = None


class UserResetPassword(BaseModel):
    newPassword: str = Field(..., min_length=6, max_length=100)


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    facultyId: Optional[str] = None
    facultyName: Optional[str] = None
    isActive: bool
    lastLoginAt: Optional[str] = None
    passwordChangedAt: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class UserLoginRequest(BaseModel):
    email: str
    password: str


class UserLoginResponse(BaseModel):
    token: str
    tokenType: str = "Bearer"
    expiresIn: int
    user: UserResponse
    permissions: List[str]


class AuthMeResponse(BaseModel):
    user: UserResponse
    permissions: List[str]
