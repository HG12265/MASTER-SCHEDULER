from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from app.database.mongodb import get_database

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str
    message: str


class ReadinessResponse(BaseModel):
    status: str
    database: str
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


@router.get(
    "/health/live",
    response_model=HealthResponse,
    summary="Liveness Probe",
    description="Quick probe to verify process is alive without expensive dependencies."
)
async def get_liveness() -> HealthResponse:
    return HealthResponse(
        status="alive",
        message="Process is alive"
    )


@router.get(
    "/health/ready",
    response_model=ReadinessResponse,
    summary="Readiness Probe",
    description="Verifies database connectivity and readiness to receive incoming traffic."
)
async def get_readiness():
    db = get_database()
    if db is None:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "error",
                "database": "disconnected",
                "message": "Database is not connected",
            },
        )
    try:
        await db.command("ping")
        return ReadinessResponse(
            status="ready",
            database="connected",
            message="Application is ready to process traffic",
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "error",
                "database": "error",
                "message": f"Database ping failed: {str(e)}",
            },
        )
