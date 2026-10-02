from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class BackupManifest(BaseModel):
    application: str = "Master Scheduler"
    backupSchemaVersion: int = 1
    createdAt: str
    createdBy: Optional[str] = None
    collections: List[str]
    totalRecords: int
    environment: str = "production"


class BackupHistoryItem(BaseModel):
    id: str
    filename: str
    createdAt: str
    createdBy: Optional[str] = None
    backupSchemaVersion: int
    collectionCount: int
    recordCount: int
    fileSizeBytes: Optional[int] = None


class BackupValidationResult(BaseModel):
    isValid: bool
    schemaVersion: Optional[int] = None
    createdAt: Optional[str] = None
    collectionCounts: Dict[str, int] = Field(default_factory=dict)
    totalRecords: int = 0
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class BackupPreviewResponse(BaseModel):
    canRestore: bool
    manifest: Optional[BackupManifest] = None
    collectionCounts: Dict[str, int] = Field(default_factory=dict)
    recordsToAdd: int = 0
    recordsToUpdate: int = 0
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)


class RestoreRequest(BaseModel):
    confirm: bool = False
    restoreMode: str = "MERGE"  # MERGE mode
