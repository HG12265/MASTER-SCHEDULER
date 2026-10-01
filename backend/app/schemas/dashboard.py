from pydantic import BaseModel, Field
from app.schemas.common import BaseResponse


class DashboardSummaryData(BaseModel):
    programmes: int = Field(0, description="Active programmes count")
    classes: int = Field(0, description="Active classes count")
    faculty: int = Field(0, description="Active faculty count")
    subjects: int = Field(0, description="Active subjects count")
    resources: int = Field(0, description="Active classrooms and laboratories count")
    allocations: int = Field(0, description="Active faculty subject allocations count")


class DashboardSummaryResponse(BaseResponse):
    data: DashboardSummaryData
