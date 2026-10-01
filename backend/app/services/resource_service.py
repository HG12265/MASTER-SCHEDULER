from typing import Any, Dict, Optional
from app.repositories.resource_repository import resource_repo
from app.repositories.faculty_allocation_repository import faculty_allocation_repo
from app.schemas.resource import ResourceCreate, ResourceUpdate
from app.utils.exceptions import ConflictException, DependencyException, NotFoundException


class ResourceService:
    async def create(self, data: ResourceCreate) -> Dict[str, Any]:
        existing = await resource_repo.find_by_code(data.code)
        if existing:
            raise ConflictException(f"Resource with code '{data.code}' already exists")
        return await resource_repo.create(data.model_dump())

    async def get_by_id(self, id_str: str) -> Dict[str, Any]:
        record = await resource_repo.get_by_id(id_str)
        if not record:
            raise NotFoundException(f"Resource with ID '{id_str}' not found")
        return record

    async def list_resources(
        self,
        resource_type: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 10,
    ) -> Dict[str, Any]:
        skip = (page - 1) * limit
        items = await resource_repo.search_resources(resource_type, is_active, search, skip, limit)
        total = await resource_repo.count_resources(resource_type, is_active, search)
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

    async def update(self, id_str: str, data: ResourceUpdate) -> Dict[str, Any]:
        record = await self.get_by_id(id_str)
        update_dict = data.model_dump(exclude_unset=True)

        if "code" in update_dict and update_dict["code"] != record["code"]:
            dup = await resource_repo.find_by_code(update_dict["code"])
            if dup and dup["id"] != id_str:
                raise ConflictException(f"Resource with code '{update_dict['code']}' already exists")

        return await resource_repo.update_by_id(id_str, update_dict)

    async def delete(self, id_str: str) -> bool:
        await self.get_by_id(id_str)

        # Referential dependency check
        alloc_count = await faculty_allocation_repo.count({"preferredResourceId": id_str})
        if alloc_count > 0:
            raise DependencyException(
                f"Resource cannot be deleted because it is set as preferred room/lab in {alloc_count} subject allocation(s)."
            )

        return await resource_repo.delete_by_id(id_str)


resource_service = ResourceService()
