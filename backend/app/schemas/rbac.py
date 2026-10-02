from enum import Enum
from typing import List, Set, Dict


class UserRole(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    HOD = "HOD"
    FACULTY = "FACULTY"
    VIEWER = "VIEWER"


class Permission(str, Enum):
    USERS_MANAGE = "users.manage"
    USERS_VIEW = "users.view"
    ACADEMIC_MANAGE = "academic.manage"
    FACULTY_MANAGE = "faculty.manage"
    SUBJECTS_MANAGE = "subjects.manage"
    SCHEDULER_CONFIGURE = "scheduler.configure"
    SCHEDULER_GENERATE = "scheduler.generate"
    TIMETABLE_EDIT = "timetable.edit"
    TIMETABLE_PUBLISH = "timetable.publish"
    LEAVE_REQUEST = "leave.request"
    LEAVE_MANAGE = "leave.manage"
    SUBSTITUTION_MANAGE = "substitution.manage"
    REPORTS_VIEW = "reports.view"
    EXPORTS_DOWNLOAD = "exports.download"
    AUDIT_VIEW = "audit.view"
    BACKUP_MANAGE = "backup.manage"
    SETTINGS_MANAGE = "settings.manage"


ROLE_PERMISSIONS: Dict[UserRole, Set[Permission]] = {
    UserRole.SUPER_ADMIN: {
        Permission.USERS_MANAGE,
        Permission.USERS_VIEW,
        Permission.ACADEMIC_MANAGE,
        Permission.FACULTY_MANAGE,
        Permission.SUBJECTS_MANAGE,
        Permission.SCHEDULER_CONFIGURE,
        Permission.SCHEDULER_GENERATE,
        Permission.TIMETABLE_EDIT,
        Permission.TIMETABLE_PUBLISH,
        Permission.LEAVE_REQUEST,
        Permission.LEAVE_MANAGE,
        Permission.SUBSTITUTION_MANAGE,
        Permission.REPORTS_VIEW,
        Permission.EXPORTS_DOWNLOAD,
        Permission.AUDIT_VIEW,
        Permission.BACKUP_MANAGE,
        Permission.SETTINGS_MANAGE,
    },
    UserRole.ADMIN: {
        Permission.USERS_VIEW,
        Permission.ACADEMIC_MANAGE,
        Permission.FACULTY_MANAGE,
        Permission.SUBJECTS_MANAGE,
        Permission.SCHEDULER_CONFIGURE,
        Permission.SCHEDULER_GENERATE,
        Permission.TIMETABLE_EDIT,
        Permission.LEAVE_MANAGE,
        Permission.SUBSTITUTION_MANAGE,
        Permission.REPORTS_VIEW,
        Permission.EXPORTS_DOWNLOAD,
    },
    UserRole.HOD: {
        Permission.USERS_VIEW,
        Permission.TIMETABLE_PUBLISH,
        Permission.LEAVE_MANAGE,
        Permission.SUBSTITUTION_MANAGE,
        Permission.REPORTS_VIEW,
        Permission.EXPORTS_DOWNLOAD,
    },
    UserRole.FACULTY: {
        Permission.LEAVE_REQUEST,
        Permission.REPORTS_VIEW,
        Permission.EXPORTS_DOWNLOAD,
    },
    UserRole.VIEWER: {
        Permission.REPORTS_VIEW,
        Permission.EXPORTS_DOWNLOAD,
    },
}


def get_permissions_for_role(role: str) -> List[str]:
    """Retrieve string list of all granted permissions for a given role string."""
    try:
        user_role = UserRole(role)
        perms = ROLE_PERMISSIONS.get(user_role, set())
        return [p.value for p in perms]
    except ValueError:
        return []
