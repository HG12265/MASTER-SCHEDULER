from app.services.academic_year_service import academic_year_service, AcademicYearService
from app.services.semester_type_service import semester_type_service, SemesterTypeService
from app.services.working_day_service import working_day_service, WorkingDayService
from app.services.time_slot_service import time_slot_service, TimeSlotService
from app.services.programme_service import programme_service, ProgrammeService
from app.services.semester_service import semester_service, SemesterService
from app.services.class_service import class_service, ClassService
from app.services.faculty_service import faculty_service, FacultyService
from app.services.subject_service import subject_service, SubjectService
from app.services.resource_service import resource_service, ResourceService
from app.services.faculty_allocation_service import (
    faculty_allocation_service,
    FacultyAllocationService,
)
from app.services.dashboard_service import dashboard_service, DashboardService

__all__ = [
    "academic_year_service",
    "AcademicYearService",
    "semester_type_service",
    "SemesterTypeService",
    "working_day_service",
    "WorkingDayService",
    "time_slot_service",
    "TimeSlotService",
    "programme_service",
    "ProgrammeService",
    "semester_service",
    "SemesterService",
    "class_service",
    "ClassService",
    "faculty_service",
    "FacultyService",
    "subject_service",
    "SubjectService",
    "resource_service",
    "ResourceService",
    "faculty_allocation_service",
    "FacultyAllocationService",
    "dashboard_service",
    "DashboardService",
]
