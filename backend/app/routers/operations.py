from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.schemas.substitution import DailyScheduleSummary
from app.services.substitution_service import substitution_service
from app.middleware.auth import get_optional_current_user

router = APIRouter(prefix="/operations", tags=["Daily Operations"])


@router.get("/daily-schedule", response_model=DailyScheduleSummary, summary="Get Daily Operational Schedule")
async def get_daily_schedule(
    date: Optional[str] = Query(None, description="Date formatted as YYYY-MM-DD. Defaults to today."),
):
    """
    Retrieve real-time operational schedule for a specific calendar date:
    Includes published timetable sessions, holidays/calendar exceptions, faculty leaves,
    substitutions, and identifies any unresolved sessions.
    """
    target_date = date if date else date.today().strftime("%Y-%m-%d")
    return await substitution_service.get_daily_operational_schedule(target_date)
