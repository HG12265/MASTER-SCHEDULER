from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection
from app.database.mongodb import get_database
from app.utils.object_id import parse_object_id, doc_to_dict, docs_to_list


class BaseRepository:
    """
    Generic MongoDB repository providing reusable CRUD operations.
    Encapsulates raw PyMongo/Motor queries and handles ObjectId conversions.
    """

    def __init__(self, collection_name: str):
        self.collection_name = collection_name

    @property
    def collection(self) -> AsyncIOMotorCollection:
        db = get_database()
        if db is None:
            raise RuntimeError(
                f"Database is not initialized. Ensure connect_to_mongo() has completed."
            )
        return db[self.collection_name]

    async def get_by_id(self, id_str: str) -> Optional[Dict[str, Any]]:
        oid = parse_object_id(id_str, entity_name=self.collection_name)
        doc = await self.collection.find_one({"_id": oid})
        return doc_to_dict(doc)

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        doc = await self.collection.find_one(query)
        return doc_to_dict(doc)

    async def find_many(
        self,
        query: Dict[str, Any] = None,
        sort: Optional[List[Tuple[str, int]]] = None,
        skip: int = 0,
        limit: int = 0,
    ) -> List[Dict[str, Any]]:
        query = query or {}
        cursor = self.collection.find(query)

        if sort:
            cursor = cursor.sort(sort)
        if skip > 0:
            cursor = cursor.skip(skip)
        if limit > 0:
            cursor = cursor.limit(limit)

        docs = await cursor.to_list(length=limit if limit > 0 else 1000)
        return docs_to_list(docs)

    async def count(self, query: Dict[str, Any] = None) -> int:
        query = query or {}
        return await self.collection.count_documents(query)

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc_data = dict(data)
        doc_data["createdAt"] = now
        doc_data["updatedAt"] = now
        if "isActive" not in doc_data:
            doc_data["isActive"] = True

        result = await self.collection.insert_one(doc_data)
        doc_data["_id"] = result.inserted_id
        return doc_to_dict(doc_data)

    async def update_by_id(
        self, id_str: str, update_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        oid = parse_object_id(id_str, entity_name=self.collection_name)
        now = datetime.now(timezone.utc)
        fields = dict(update_data)
        # Never overwrite _id or createdAt
        fields.pop("id", None)
        fields.pop("_id", None)
        fields.pop("createdAt", None)
        fields["updatedAt"] = now

        result = await self.collection.find_one_and_update(
            {"_id": oid},
            {"$set": fields},
            return_document=True,
        )
        return doc_to_dict(result)

    async def delete_by_id(self, id_str: str) -> bool:
        oid = parse_object_id(id_str, entity_name=self.collection_name)
        result = await self.collection.delete_one({"_id": oid})
        return result.deleted_count > 0

    async def set_active(self, id_str: str, is_active: bool) -> Optional[Dict[str, Any]]:
        return await self.update_by_id(id_str, {"isActive": is_active})
