from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ExportHistoryRecord(BaseModel):
    id: str
    timetableId: str
    exportType: str = Field(..., description="PDF or EXCEL")
    viewType: str = Field(..., description="class, faculty, master, or report")
    classId: Optional[str] = None
    facultyId: Optional[str] = None
    reportType: Optional[str] = None
    filename: str
    fileSizeBytes: Optional[int] = None
    generatedAt: datetime
    generatedBy: Optional[str] = None
