import io
import json
import zipfile
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
from app.repositories.base_repository import BaseRepository
from app.schemas.backup import (
    BackupManifest,
    BackupValidationResult,
    BackupPreviewResponse,
    BackupHistoryItem,
)
from app.services.audit_service import audit_service
from app.utils.exceptions import BadRequestException
from app.utils.logger import get_logger

logger = get_logger(__name__)

BACKUP_COLLECTIONS = [
    "academic_years",
    "semester_types",
    "working_days",
    "time_slots",
    "programmes",
    "semesters",
    "classes",
    "faculty",
    "subjects",
    "resources",
    "faculty_subject_allocations",
    "faculty_availability",
    "fixed_timetable_slots",
    "scheduling_settings",
    "class_constraints",
    "faculty_constraints",
    "subject_constraints",
    "timetables",
    "timetable_entries",
    "institution_settings",
    "system_settings",
    "academic_calendar_exceptions",
]

SCHEMA_VERSION = 1


def serialize_for_backup(val: Any) -> Any:
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, dict):
        return {k: serialize_for_backup(v) for k, v in val.items()}
    if isinstance(val, list):
        return [serialize_for_backup(i) for i in val]
    return val


class BackupService:
    def __init__(self):
        self.history_repo = BaseRepository("backup_history")

    async def export_backup(self, current_user: Dict[str, Any] = None) -> Tuple[bytes, str]:
        """
        Generate a versioned ZIP backup containing JSON exports of academic and operational collections.
        Excludes passwords, hashes, and secrets.
        """
        buffer = io.BytesIO()
        total_records = 0
        counts: Dict[str, int] = {}
        created_at_str = datetime.now(timezone.utc).isoformat()
        user_name = current_user.get("username") if current_user else "SYSTEM"

        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for coll_name in BACKUP_COLLECTIONS:
                repo = BaseRepository(coll_name)
                docs = await repo.find_many({}, limit=10000)

                # Sanitize if any sensitive collection
                cleaned_docs = []
                for d in docs:
                    clean_d = serialize_for_backup(d)
                    clean_d.pop("password", None)
                    clean_d.pop("passwordHash", None)
                    cleaned_docs.append(clean_d)

                count = len(cleaned_docs)
                counts[coll_name] = count
                total_records += count

                json_bytes = json.dumps(cleaned_docs, indent=2).encode("utf-8")
                zf.writestr(f"{coll_name}.json", json_bytes)

            # Write manifest.json
            manifest = BackupManifest(
                application="Master Scheduler",
                backupSchemaVersion=SCHEMA_VERSION,
                createdAt=created_at_str,
                createdBy=user_name,
                collections=BACKUP_COLLECTIONS,
                totalRecords=total_records,
                environment="production",
            )
            zf.writestr("manifest.json", json.dumps(manifest.model_dump(), indent=2).encode("utf-8"))

        buffer.seek(0)
        zip_bytes = buffer.getvalue()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"master_scheduler_backup_{timestamp}.zip"

        # Record in backup history metadata
        history_entry = {
            "filename": filename,
            "createdAt": datetime.now(timezone.utc),
            "createdBy": user_name,
            "backupSchemaVersion": SCHEMA_VERSION,
            "collectionCount": len(BACKUP_COLLECTIONS),
            "recordCount": total_records,
            "fileSizeBytes": len(zip_bytes),
        }
        await self.history_repo.create(history_entry)

        # Audit log
        await audit_service.log_action(
            action="BACKUP_EXPORTED",
            entity_type="Backup",
            description=f"Administrative backup exported ({total_records} records, {len(BACKUP_COLLECTIONS)} collections)",
            user=current_user,
            metadata={"filename": filename, "totalRecords": total_records, "sizeBytes": len(zip_bytes)},
        )

        return zip_bytes, filename

    def parse_and_validate_zip(self, zip_bytes: bytes) -> Tuple[BackupManifest, Dict[str, List[Dict[str, Any]]], BackupValidationResult]:
        errors: List[str] = []
        warnings: List[str] = []
        collections_data: Dict[str, List[Dict[str, Any]]] = {}
        manifest: Optional[BackupManifest] = None

        try:
            buffer = io.BytesIO(zip_bytes)
            with zipfile.ZipFile(buffer, "r") as zf:
                file_list = zf.namelist()
                if "manifest.json" not in file_list:
                    errors.append("Invalid backup archive: missing 'manifest.json'")
                    return None, {}, BackupValidationResult(isValid=False, errors=errors)

                # Parse manifest
                try:
                    manifest_raw = json.loads(zf.read("manifest.json").decode("utf-8"))
                    manifest = BackupManifest(**manifest_raw)
                except Exception as e:
                    errors.append(f"Corrupt manifest.json: {e}")
                    return None, {}, BackupValidationResult(isValid=False, errors=errors)

                if manifest.backupSchemaVersion > SCHEMA_VERSION:
                    errors.append(f"Unsupported backup schema version {manifest.backupSchemaVersion}. Maximum supported is {SCHEMA_VERSION}.")
                    return manifest, {}, BackupValidationResult(isValid=False, errors=errors)

                # Parse each collection
                for fname in file_list:
                    if fname == "manifest.json":
                        continue
                    if fname.endswith(".json"):
                        coll_name = fname[:-5]
                        try:
                            data = json.loads(zf.read(fname).decode("utf-8"))
                            if isinstance(data, list):
                                collections_data[coll_name] = data
                            else:
                                warnings.append(f"Skipping {fname}: expected array of records.")
                        except Exception as e:
                            warnings.append(f"Failed to parse {fname}: {e}")

        except Exception as e:
            errors.append(f"Failed to read ZIP archive: {e}")
            return None, {}, BackupValidationResult(isValid=False, errors=errors)

        is_valid = len(errors) == 0
        counts = {k: len(v) for k, v in collections_data.items()}
        total_records = sum(counts.values())

        val_result = BackupValidationResult(
            isValid=is_valid,
            schemaVersion=manifest.backupSchemaVersion if manifest else None,
            createdAt=manifest.createdAt if manifest else None,
            collectionCounts=counts,
            totalRecords=total_records,
            errors=errors,
            warnings=warnings,
        )

        return manifest, collections_data, val_result

    async def preview_restore(self, zip_bytes: bytes) -> BackupPreviewResponse:
        manifest, colls_data, val = self.parse_and_validate_zip(zip_bytes)
        if not val.isValid:
            return BackupPreviewResponse(
                canRestore=False,
                manifest=manifest,
                collectionCounts=val.collectionCounts,
                recordsToAdd=0,
                recordsToUpdate=0,
                warnings=val.warnings,
                errors=val.errors,
            )

        records_to_add = 0
        records_to_update = 0

        for coll_name, records in colls_data.items():
            repo = BaseRepository(coll_name)
            for rec in records:
                rec_id = str(rec.get("id") or rec.get("_id", ""))
                if rec_id:
                    existing = await repo.get_by_id(rec_id)
                    if existing:
                        records_to_update += 1
                    else:
                        records_to_add += 1
                else:
                    records_to_add += 1

        return BackupPreviewResponse(
            canRestore=True,
            manifest=manifest,
            collectionCounts=val.collectionCounts,
            recordsToAdd=records_to_add,
            recordsToUpdate=records_to_update,
            warnings=val.warnings,
            errors=[],
        )

    async def restore_backup(
        self,
        zip_bytes: bytes,
        confirm: bool,
        current_user: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        if not confirm:
            raise BadRequestException("Explicit confirmation ('confirm': true) is required to restore data.")

        manifest, colls_data, val = self.parse_and_validate_zip(zip_bytes)
        if not val.isValid:
            raise BadRequestException(f"Cannot restore: {', '.join(val.errors)}")

        restored_counts: Dict[str, int] = {}
        total_restored = 0

        for coll_name, records in colls_data.items():
            if coll_name not in BACKUP_COLLECTIONS:
                continue

            repo = BaseRepository(coll_name)
            coll_restored = 0

            for rec in records:
                rec_id = str(rec.get("id") or rec.get("_id", ""))
                # Remove _id from dict to avoid immutable ID modification in Mongo
                rec_copy = dict(rec)
                rec_copy.pop("_id", None)
                rec_copy.pop("id", None)

                if rec_id:
                    existing = await repo.get_by_id(rec_id)
                    if existing:
                        await repo.update_by_id(rec_id, rec_copy)
                    else:
                        # Insert with preserved ID
                        from app.utils.object_id import parse_object_id
                        try:
                            rec_copy["_id"] = parse_object_id(rec_id)
                        except Exception:
                            pass
                        await repo.collection.insert_one(rec_copy)
                else:
                    await repo.create(rec_copy)

                coll_restored += 1

            restored_counts[coll_name] = coll_restored
            total_restored += coll_restored

        await audit_service.log_action(
            action="BACKUP_RESTORED",
            entity_type="Backup",
            description=f"Safe backup restore completed ({total_restored} records across {len(restored_counts)} collections)",
            user=current_user,
            metadata={"collections": list(restored_counts.keys()), "totalRestored": total_restored},
        )

        return {
            "success": True,
            "message": f"Successfully restored {total_restored} records.",
            "collectionCounts": restored_counts,
            "totalRestored": total_restored,
        }

    async def list_history(self) -> List[BackupHistoryItem]:
        docs = await self.history_repo.find_many({}, sort=[("createdAt", -1)], limit=50)
        items: List[BackupHistoryItem] = []
        for d in docs:
            items.append(
                BackupHistoryItem(
                    id=str(d.get("id") or d.get("_id")),
                    filename=str(d.get("filename", "")),
                    createdAt=d.get("createdAt").isoformat() if isinstance(d.get("createdAt"), datetime) else str(d.get("createdAt")),
                    createdBy=d.get("createdBy"),
                    backupSchemaVersion=d.get("backupSchemaVersion", 1),
                    collectionCount=d.get("collectionCount", 0),
                    recordCount=d.get("recordCount", 0),
                    fileSizeBytes=d.get("fileSizeBytes"),
                )
            )
        return items


backup_service = BackupService()
