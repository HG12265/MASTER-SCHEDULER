from datetime import datetime
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field


class CalendarExceptionType(str, Enum):
    HOLIDAY = "HOLIDAY"
    WORKING_SATURDAY = "WORKING_SATURDAY"
    SPECIAL_WORKING_DAY = "SPECIAL_WORKING_DAY"
    EXAM_DAY = "EXAM_DAY"
    NO_CLASS_DAY = "NO_CLASS_DAY"
    OTHER = "OTHER"


class AcademicCalendarExceptionCreate(BaseModel):
    academicYearId: str
    date: str = Field(..., description="Date formatted as YYYY-MM-DD")
    type: CalendarExceptionType = CalendarExceptionType.HOLIDAY
    title: str = Field(..., min_length=2, max_length=100)
    isTeachingDay: bool = False
    mappedWorkingDayId: Optional[str] = None
    notes: Optional[str] = None


class AcademicCalendarExceptionUpdate(BaseModel):
    type: Optional[CalendarExceptionType] = None
    title: Optional[str] = None
    isTeachingDay: Optional[bool] = None
    mappedWorkingDayId: Optional[str] = None
    notes: Optional[str] = None


class AcademicCalendarExceptionResponse(BaseModel):
    id: str
    academicYearId: str
    academicYearName: Optional[str] = None
    date: str
    type: str
    title: str
    isTeachingDay: bool
    mappedWorkingDayId: Optional[str] = None
    mappedWorkingDayName: Optional[str] = None
    notes: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class DateLookupResponse(BaseModel):
    date: str
    dayOfWeek: str
    isWorkingDay: bool
    isTeachingDay: bool
    effectiveWorkingDayId: Optional[str] = None
    effectiveWorkingDayName: Optional[str] = None
    isException: bool
    exceptionType: Optional[str] = None
    exceptionTitle: Optional[str] = None
