from typing import Any, Dict, List, Optional
from bson import ObjectId
from bson.errors import InvalidId
from app.utils.exceptions import BadRequestException


def parse_object_id(id_val: Any, entity_name: str = "Resource") -> ObjectId:
    """
    Safely parse and validate a string as a MongoDB ObjectId.
    Raises BadRequestException with a clear message if invalid.
    """
    if isinstance(id_val, ObjectId):
        return id_val
    if not id_val or not isinstance(id_val, str):
        raise BadRequestException(f"Invalid {entity_name} ID: ID must be a non-empty string")
    try:
        return ObjectId(id_val.strip())
    except (InvalidId, TypeError):
        raise BadRequestException(f"Invalid {entity_name} ID format: '{id_val}' is not a valid 24-character hexadecimal ObjectId")


def is_valid_object_id(id_val: Any) -> bool:
    """Return True if the value is or can be parsed as a valid ObjectId."""
    if isinstance(id_val, ObjectId):
        return True
    if not isinstance(id_val, str):
        return False
    try:
        ObjectId(id_val.strip())
        return True
    except (InvalidId, TypeError):
        return False


def doc_to_dict(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Convert a MongoDB document into a client-safe dictionary:
    - Replaces '_id' with string 'id'
    - Recursively formats datetime and nested ObjectIds
    """
    if doc is None:
        return None

    result = {}
    for key, value in doc.items():
        if key == "_id":
            result["id"] = str(value)
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, list):
            result[key] = [
                str(item) if isinstance(item, ObjectId) else (
                    doc_to_dict(item) if isinstance(item, dict) else item
                )
                for item in value
            ]
        elif isinstance(value, dict):
            result[key] = doc_to_dict(value)
        else:
            result[key] = value
    return result


def docs_to_list(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Convert a list of MongoDB documents into client-safe dictionaries."""
    return [doc_to_dict(doc) for doc in docs if doc is not None]
