from typing import Any, Dict
from app.repositories.programme_repository import programme_repo
from app.repositories.class_repository import class_repo
from app.repositories.faculty_repository import faculty_repo
from app.repositories.subject_repository import subject_repo
from app.repositories.resource_repository import resource_repo
from app.repositories.faculty_allocation_repository import faculty_allocation_repo


class DashboardService:
    async def get_summary(self) -> Dict[str, Any]:
        """
        Count all active records across the core academic collections.
        """
        active_filter = {"isActive": True}

        programmes_count = await programme_repo.count(active_filter)
        classes_count = await class_repo.count(active_filter)
        faculty_count = await faculty_repo.count(active_filter)
        subjects_count = await subject_repo.count(active_filter)
        resources_count = await resource_repo.count(active_filter)
        allocations_count = await faculty_allocation_repo.count(active_filter)

        return {
            "programmes": programmes_count,
            "classes": classes_count,
            "faculty": faculty_count,
            "subjects": subjects_count,
            "resources": resources_count,
            "allocations": allocations_count,
        }


dashboard_service = DashboardService()
