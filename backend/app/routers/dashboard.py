from fastapi import APIRouter
from app.schemas.dashboard import DashboardSummaryResponse, DashboardSummaryData
from app.services.dashboard_service import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    summary="Get Dashboard Active Entity Summary",
    description="Returns aggregate counts of active programmes, classes, faculty, subjects, resources, and allocations.",
)
async def get_dashboard_summary():
    data = await dashboard_service.get_summary()
    return DashboardSummaryResponse(
        success=True,
        message="Dashboard summary retrieved successfully",
        data=DashboardSummaryData(**data),
    )
