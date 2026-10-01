from typing import Any, Dict, List, Optional
from bson import ObjectId
from app.repositories.base_repository import BaseRepository
from app.utils.object_id import docs_to_list, doc_to_dict, parse_object_id


class FixedSlotRepository(BaseRepository):
    def __init__(self):
        super().__init__("fixed_timetable_slots")

    def build_query(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        class_id: Optional[str] = None,
        faculty_id: Optional[str] = None,
        working_day_id: Optional[str] = None,
        slot_category: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}
        if academic_year_id:
            query["academicYearId"] = academic_year_id
        if semester_type_id:
            query["semesterTypeId"] = semester_type_id
        if class_id:
            query["classId"] = class_id
        if faculty_id:
            query["facultyIds"] = faculty_id
        if working_day_id:
            query["workingDayId"] = working_day_id
        if slot_category:
            query["slotCategory"] = slot_category
        if is_active is not None:
            query["isActive"] = is_active
        return query

    async def search_fixed_slots(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        class_id: Optional[str] = None,
        faculty_id: Optional[str] = None,
        working_day_id: Optional[str] = None,
        slot_category: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 0,
    ) -> List[Dict[str, Any]]:
        query = self.build_query(
            academic_year_id,
            semester_type_id,
            class_id,
            faculty_id,
            working_day_id,
            slot_category,
            is_active,
        )
        cursor = self.collection.find(query).sort("createdAt", -1)
        if skip > 0:
            cursor = cursor.skip(skip)
        if limit > 0:
            cursor = cursor.limit(limit)
        docs = await cursor.to_list(length=limit if limit > 0 else 1000)
        return docs_to_list(docs)

    async def count_fixed_slots(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        class_id: Optional[str] = None,
        faculty_id: Optional[str] = None,
        working_day_id: Optional[str] = None,
        slot_category: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> int:
        query = self.build_query(
            academic_year_id,
            semester_type_id,
            class_id,
            faculty_id,
            working_day_id,
            slot_category,
            is_active,
        )
        return await self.collection.count_documents(query)

    async def find_class_slot(
        self,
        academic_year_id: str,
        semester_type_id: str,
        class_id: str,
        working_day_id: str,
        time_slot_id: str,
        exclude_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        query: Dict[str, Any] = {
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
            "classId": class_id,
            "workingDayId": working_day_id,
            "timeSlotId": time_slot_id,
            "isActive": True,
        }
        if exclude_id:
            query["_id"] = {"$ne": parse_object_id(exclude_id, "fixed_timetable_slots")}
        doc = await self.collection.find_one(query)
        return doc_to_dict(doc)

    async def find_faculty_conflict(
        self,
        academic_year_id: str,
        semester_type_id: str,
        faculty_id: str,
        working_day_id: str,
        time_slot_id: str,
        exclude_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        query: Dict[str, Any] = {
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
            "facultyIds": faculty_id,
            "workingDayId": working_day_id,
            "timeSlotId": time_slot_id,
            "isActive": True,
        }
        if exclude_id:
            query["_id"] = {"$ne": parse_object_id(exclude_id, "fixed_timetable_slots")}
        doc = await self.collection.find_one(query)
        return doc_to_dict(doc)

    async def find_resource_conflict(
        self,
        academic_year_id: str,
        semester_type_id: str,
        resource_id: str,
        working_day_id: str,
        time_slot_id: str,
        exclude_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        query: Dict[str, Any] = {
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
            "resourceId": resource_id,
            "workingDayId": working_day_id,
            "timeSlotId": time_slot_id,
            "isActive": True,
        }
        if exclude_id:
            query["_id"] = {"$ne": parse_object_id(exclude_id, "fixed_timetable_slots")}
        doc = await self.collection.find_one(query)
        return doc_to_dict(doc)


fixed_slot_repo = FixedSlotRepository()
