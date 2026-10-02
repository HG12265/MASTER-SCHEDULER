from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.repositories.base_repository import BaseRepository
from app.utils.object_id import docs_to_list, doc_to_dict


class FacultyAvailabilityRepository(BaseRepository):
    def __init__(self):
        super().__init__("faculty_availability")

    def build_query(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        faculty_id: Optional[str] = None,
        working_day_id: Optional[str] = None,
        availability_status: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {}
        if academic_year_id:
            query["academicYearId"] = academic_year_id
        if semester_type_id:
            query["semesterTypeId"] = semester_type_id
        if faculty_id:
            query["facultyId"] = faculty_id
        if working_day_id:
            query["workingDayId"] = working_day_id
        if availability_status:
            query["availabilityStatus"] = availability_status
        if is_active is not None:
            query["isActive"] = is_active
        return query

    async def search_availability(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        faculty_id: Optional[str] = None,
        working_day_id: Optional[str] = None,
        availability_status: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 0,
    ) -> List[Dict[str, Any]]:
        query = self.build_query(
            academic_year_id,
            semester_type_id,
            faculty_id,
            working_day_id,
            availability_status,
            is_active,
        )
        cursor = self.collection.find(query).sort("createdAt", -1)
        if skip > 0:
            cursor = cursor.skip(skip)
        if limit > 0:
            cursor = cursor.limit(limit)
        docs = await cursor.to_list(length=limit if limit > 0 else 1000)
        return docs_to_list(docs)

    async def count_availability(
        self,
        academic_year_id: Optional[str] = None,
        semester_type_id: Optional[str] = None,
        faculty_id: Optional[str] = None,
        working_day_id: Optional[str] = None,
        availability_status: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> int:
        query = self.build_query(
            academic_year_id,
            semester_type_id,
            faculty_id,
            working_day_id,
            availability_status,
            is_active,
        )
        return await self.collection.count_documents(query)

    async def find_slot(
        self,
        academic_year_id: str,
        semester_type_id: str,
        faculty_id: str,
        working_day_id: str,
        time_slot_id: str,
    ) -> Optional[Dict[str, Any]]:
        query = {
            "academicYearId": academic_year_id,
            "semesterTypeId": semester_type_id,
            "facultyId": faculty_id,
            "workingDayId": working_day_id,
            "timeSlotId": time_slot_id,
        }
        doc = await self.collection.find_one(query)
        return doc_to_dict(doc)

    async def bulk_upsert(
        self,
        academic_year_id: str,
        semester_type_id: str,
        faculty_id: str,
        entries: List[Dict[str, Any]],
    ) -> int:
        """
        Efficient bulk upsert for faculty availability.
        - If status == AVAILABLE, remove existing exception to avoid bloat.
        - Otherwise, upsert the exception record.
        """
        now = datetime.now(timezone.utc)
        modified_count = 0

        for entry in entries:
            w_id = entry["workingDayId"]
            t_id = entry["timeSlotId"]
            status = entry["availabilityStatus"].upper()

            query = {
                "academicYearId": academic_year_id,
                "semesterTypeId": semester_type_id,
                "facultyId": faculty_id,
                "workingDayId": w_id,
                "timeSlotId": t_id,
            }

            if status == "AVAILABLE":
                # Remove exception record if present
                res = await self.collection.delete_one(query)
                if res.deleted_count > 0:
                    modified_count += 1
            else:
                update_doc = {
                    "$set": {
                        "availabilityStatus": status,
                        "reason": entry.get("reason"),
                        "notes": entry.get("notes"),
                        "isActive": True,
                        "updatedAt": now,
                    },
                    "$setOnInsert": {
                        "academicYearId": academic_year_id,
                        "semesterTypeId": semester_type_id,
                        "facultyId": faculty_id,
                        "workingDayId": w_id,
                        "timeSlotId": t_id,
                        "createdAt": now,
                    },
                }
                res = await self.collection.update_one(query, update_doc, upsert=True)
                if res.modified_count > 0 or res.upserted_id is not None:
                    modified_count += 1

        return modified_count


faculty_availability_repo = FacultyAvailabilityRepository()
faculty_availability_repository = faculty_availability_repo

