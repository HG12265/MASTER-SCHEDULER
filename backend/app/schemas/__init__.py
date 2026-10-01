from app.schemas.common import (
    BaseResponse,
    DataResponse,
    PaginatedResponse,
    PaginationMeta,
    PaginationParams,
    BaseEntity,
)
from app.schemas.academic_year import (
    AcademicYearCreate,
    AcademicYearUpdate,
    AcademicYearResponse,
)
from app.schemas.semester_type import (
    SemesterTypeCreate,
    SemesterTypeUpdate,
    SemesterTypeResponse,
)
from app.schemas.working_day import (
    WorkingDayCreate,
    WorkingDayUpdate,
    WorkingDayResponse,
)
from app.schemas.time_slot import (
    TimeSlotCreate,
    TimeSlotUpdate,
    TimeSlotResponse,
)
from app.schemas.programme import (
    ProgrammeCreate,
    ProgrammeUpdate,
    ProgrammeResponse,
)
from app.schemas.semester import (
    SemesterCreate,
    SemesterUpdate,
    SemesterResponse,
)
from app.schemas.class_model import (
    ClassCreate,
    ClassUpdate,
    ClassResponse,
)
from app.schemas.faculty import (
    FacultyCreate,
    FacultyUpdate,
    FacultyResponse,
)
from app.schemas.subject import (
    SubjectCreate,
    SubjectUpdate,
    SubjectResponse,
)
from app.schemas.resource import (
    ResourceCreate,
    ResourceUpdate,
    ResourceResponse,
)
from app.schemas.faculty_allocation import (
    FacultyAllocationCreate,
    FacultyAllocationUpdate,
    FacultyAllocationResponse,
)
from app.schemas.dashboard import (
    DashboardSummaryData,
    DashboardSummaryResponse,
)

__all__ = [
    "BaseResponse",
    "DataResponse",
    "PaginatedResponse",
    "PaginationMeta",
    "PaginationParams",
    "BaseEntity",
    "AcademicYearCreate",
    "AcademicYearUpdate",
    "AcademicYearResponse",
    "SemesterTypeCreate",
    "SemesterTypeUpdate",
    "SemesterTypeResponse",
    "WorkingDayCreate",
    "WorkingDayUpdate",
    "WorkingDayResponse",
    "TimeSlotCreate",
    "TimeSlotUpdate",
    "TimeSlotResponse",
    "ProgrammeCreate",
    "ProgrammeUpdate",
    "ProgrammeResponse",
    "SemesterCreate",
    "SemesterUpdate",
    "SemesterResponse",
    "ClassCreate",
    "ClassUpdate",
    "ClassResponse",
    "FacultyCreate",
    "FacultyUpdate",
    "FacultyResponse",
    "SubjectCreate",
    "SubjectUpdate",
    "SubjectResponse",
    "ResourceCreate",
    "ResourceUpdate",
    "ResourceResponse",
    "FacultyAllocationCreate",
    "FacultyAllocationUpdate",
    "FacultyAllocationResponse",
    "DashboardSummaryData",
    "DashboardSummaryResponse",
]
