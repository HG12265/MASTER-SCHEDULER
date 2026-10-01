from datetime import datetime
from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationMeta(BaseModel):
    page: int = Field(..., description="Current page number", ge=1)
    limit: int = Field(..., description="Number of items per page", ge=1, le=100)
    total: int = Field(..., description="Total count of matching items", ge=0)
    totalPages: int = Field(..., description="Total number of pages", ge=0)


class PaginationParams(BaseModel):
    page: int = Field(1, ge=1, description="Page number")
    limit: int = Field(10, ge=1, le=100, description="Items per page (max 100)")


class BaseResponse(BaseModel):
    success: bool = True
    message: str = "Operation completed successfully"


class DataResponse(BaseResponse, Generic[T]):
    data: Optional[T] = None


class PaginatedResponse(BaseResponse, Generic[T]):
    data: List[T] = Field(default_factory=list)
    pagination: PaginationMeta


class BaseEntity(BaseModel):
    id: str = Field(..., description="Unique entity identifier (hex string)")
    isActive: bool = Field(True, description="Record active status")
    createdAt: datetime = Field(..., description="Creation UTC timestamp")
    updatedAt: datetime = Field(..., description="Last update UTC timestamp")

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
    }
