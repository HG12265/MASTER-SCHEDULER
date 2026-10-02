from fastapi import APIRouter
from app.routers.health import router as health_router
from app.routers.academic_years import router as academic_years_router
from app.routers.semester_types import router as semester_types_router
from app.routers.working_days import router as working_days_router
from app.routers.time_slots import router as time_slots_router
from app.routers.programmes import router as programmes_router
from app.routers.semesters import router as semesters_router
from app.routers.classes import router as classes_router
from app.routers.faculty import router as faculty_router
from app.routers.subjects import router as subjects_router
from app.routers.resources import router as resources_router
from app.routers.faculty_allocations import router as faculty_allocations_router
from app.routers.dashboard import router as dashboard_router

# Phase 4 Scheduling Configuration & Pre-Validation Routers
from app.routers.faculty_availability import router as faculty_availability_router
from app.routers.fixed_slots import router as fixed_slots_router
from app.routers.scheduling_settings import router as scheduling_settings_router
from app.routers.class_constraints import router as class_constraints_router
from app.routers.faculty_constraints import router as faculty_constraints_router
from app.routers.subject_constraints import router as subject_constraints_router
from app.routers.scheduler import router as scheduler_router
from app.routers.timetables import router as timetables_router
from app.routers.timetable_edit import router as timetable_edit_router

# Phase 7 Reports, Analytics & Official Institution Configuration
from app.routers.institution_settings import router as institution_settings_router
from app.routers.reports import router as reports_router

# Phase 8 Operational Management, RBAC, Faculty Portal & Production System
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.audit_logs import router as audit_logs_router
from app.routers.notifications import router as notifications_router
from app.routers.academic_calendar import router as academic_calendar_router
from app.routers.leave_requests import router as leave_requests_router
from app.routers.substitutions import router as substitutions_router
from app.routers.operations import router as operations_router
from app.routers.system import router as system_router

api_router = APIRouter()

# Health Check & Probes
api_router.include_router(health_router)

# Phase 8 Authentication & RBAC User Management
api_router.include_router(auth_router)
api_router.include_router(users_router)

# Phase 2 Core Academic Configuration & Domain Routers
api_router.include_router(academic_years_router)
api_router.include_router(semester_types_router)
api_router.include_router(working_days_router)
api_router.include_router(time_slots_router)
api_router.include_router(programmes_router)
api_router.include_router(semesters_router)
api_router.include_router(classes_router)
api_router.include_router(faculty_router)
api_router.include_router(subjects_router)
api_router.include_router(resources_router)
api_router.include_router(faculty_allocations_router)
api_router.include_router(dashboard_router)

# Phase 4 Scheduling Configuration & Pre-Validation Routers
api_router.include_router(faculty_availability_router)
api_router.include_router(fixed_slots_router)
api_router.include_router(scheduling_settings_router)
api_router.include_router(class_constraints_router)
api_router.include_router(faculty_constraints_router)
api_router.include_router(subject_constraints_router)
api_router.include_router(scheduler_router)

# Phase 5 Timetable Engine & History
api_router.include_router(timetables_router)

# Phase 6 Timetable Editing & Partial Regeneration
api_router.include_router(timetable_edit_router)

# Phase 7 Reports & Institution Settings
api_router.include_router(institution_settings_router)
api_router.include_router(reports_router)

# Phase 8 Operations, Leave, Substitutions, Calendar, Audit & System
api_router.include_router(academic_calendar_router)
api_router.include_router(leave_requests_router)
api_router.include_router(substitutions_router)
api_router.include_router(operations_router)
api_router.include_router(notifications_router)
api_router.include_router(audit_logs_router)
api_router.include_router(system_router)
