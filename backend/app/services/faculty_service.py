from typing import Any, Dict, Optional
from app.repositories.faculty_repository import faculty_repo
from app.repositories.faculty_allocation_repository import faculty_allocation_repo
from app.schemas.faculty import FacultyCreate, FacultyUpdate
from app.utils.exceptions import ConflictException, DependencyException, NotFoundException


class FacultyService:
    async def create(self, data: FacultyCreate) -> Dict[str, Any]:
        # Check facultyCode uniqueness
        existing_code = await faculty_repo.find_by_code(data.facultyCode)
        if existing_code:
            raise ConflictException(f"Faculty member with code '{data.facultyCode}' already exists")

        # Check email uniqueness if email provided
        if data.email:
            existing_email = await faculty_repo.find_by_email(data.email)
            if existing_email:
                raise ConflictException(f"Faculty member with email '{data.email}' already exists")

        return await faculty_repo.create(data.model_dump())

    async def get_by_id(self, id_str: str) -> Dict[str, Any]:
        record = await faculty_repo.get_by_id(id_str)
        if not record:
            raise NotFoundException(f"Faculty member with ID '{id_str}' not found")
        return record

    async def list_faculty(
        self,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        page: int = 1,
        limit: int = 10,
    ) -> Dict[str, Any]:
        skip = (page - 1) * limit
        items = await faculty_repo.search_faculty(search, is_active, skip, limit)
        total = await faculty_repo.count_faculty(search, is_active)
        total_pages = (total + limit - 1) // limit if limit > 0 else 1

        return {
            "items": items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
            },
        }

    async def update(self, id_str: str, data: FacultyUpdate) -> Dict[str, Any]:
        record = await self.get_by_id(id_str)
        update_dict = data.model_dump(exclude_unset=True)

        if "facultyCode" in update_dict and update_dict["facultyCode"] != record["facultyCode"]:
            dup_code = await faculty_repo.find_by_code(update_dict["facultyCode"])
            if dup_code and dup_code["id"] != id_str:
                raise ConflictException(f"Faculty member with code '{update_dict['facultyCode']}' already exists")

        if "email" in update_dict and update_dict["email"] is not None:
            if update_dict["email"] != record.get("email"):
                dup_email = await faculty_repo.find_by_email(update_dict["email"])
                if dup_email and dup_email["id"] != id_str:
                    raise ConflictException(f"Faculty member with email '{update_dict['email']}' already exists")

        return await faculty_repo.update_by_id(id_str, update_dict)

    async def delete(self, id_str: str) -> bool:
        await self.get_by_id(id_str)

        # Referential dependency check: facultyIds array in allocations
        alloc_count = await faculty_allocation_repo.count({"facultyIds": id_str})
        if alloc_count > 0:
            raise DependencyException(
                f"Faculty member cannot be deleted because they are assigned to {alloc_count} subject allocation(s)."
            )

        return await faculty_repo.delete_by_id(id_str)


faculty_service = FacultyService()
