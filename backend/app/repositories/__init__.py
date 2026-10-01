from app.repositories.base_repository import BaseRepository
from app.repositories.academic_year_repository import academic_year_repo, AcademicYearRepository
from app.repositories.semester_type_repository import semester_type_repo, SemesterTypeRepository
from app.repositories.working_day_repository import working_day_repo, WorkingDayRepository
from app.repositories.time_slot_repository import time_slot_repo, TimeSlotRepository
from app.repositories.programme_repository import programme_repo, ProgrammeRepository
from app.repositories.semester_repository import semester_repo, SemesterRepository
from app.repositories.class_repository import class_repo, ClassRepository
from app.repositories.faculty_repository import faculty_repo, FacultyRepository
from app.repositories.subject_repository import subject_repo, SubjectRepository
from app.repositories.resource_repository import resource_repo, ResourceRepository
from app.repositories.faculty_allocation_repository import (
    faculty_allocation_repo,
    FacultyAllocationRepository,
)

__all__ = [
    "BaseRepository",
    "academic_year_repo",
    "AcademicYearRepository",
    "semester_type_repo",
    "SemesterTypeRepository",
    "working_day_repo",
    "WorkingDayRepository",
    "time_slot_repo",
    "TimeSlotRepository",
    "programme_repo",
    "ProgrammeRepository",
    "semester_repo",
    "SemesterRepository",
    "class_repo",
    "ClassRepository",
    "faculty_repo",
    "FacultyRepository",
    "subject_repo",
    "SubjectRepository",
    "resource_repo",
    "ResourceRepository",
    "faculty_allocation_repo",
    "FacultyAllocationRepository",
]
