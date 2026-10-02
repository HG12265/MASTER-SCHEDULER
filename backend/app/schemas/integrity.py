from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel


class IssueSeverity(str, Enum):
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"


class IntegrityIssue(BaseModel):
    severity: IssueSeverity
    category: str
    entityType: str
    entityId: Optional[str] = None
    entityIdentifier: Optional[str] = None
    description: str
    suggestedFix: Optional[str] = None


class IntegrityCheckResult(BaseModel):
    totalIssues: int
    errorCount: int
    warningCount: int
    infoCount: int
    passed: bool
    issues: List[IntegrityIssue]
    checkedAt: str
