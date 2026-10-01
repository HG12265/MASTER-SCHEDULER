from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str
    message: str


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Returns the operational status of the Master Scheduler API."
)
async def get_health() -> HealthResponse:
    """Check API service health status."""
    return HealthResponse(
        status="success",
        message="Master Scheduler API is running"
    )
