from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple


@dataclass
class NormalizedSlot:
    slot_idx: int
    working_day_id: str
    time_slot_id: str
    day_order: int
    slot_order: int
    is_teaching: bool
    day_name: str
    slot_name: str
    start_time: str
    end_time: str


@dataclass
class NormalizedBlock:
    block_idx: int
    working_day_id: str
    day_order: int
    slot_indices: List[int]
    start_slot_idx: int
    block_size: int


@dataclass
class NormalizedAllocation:
    alloc_idx: int
    allocation_id: str
    class_id: str
    subject_id: str
    faculty_ids: List[str]
    weekly_hours: int
    block_size: int
    requires_consecutive: bool
    preferred_resource_id: Optional[str]
    subject_type: str
    subject_name: str
    subject_code: str
    class_name: str
    effective_remaining_hours: int
    fixed_periods_count: int = 0


@dataclass
class NormalizedFixedSlot:
    id: str
    class_id: str
    working_day_id: str
    time_slot_id: str
    slot_idx: int
    slot_category: str
    subject_id: Optional[str]
    faculty_ids: List[str]
    resource_id: Optional[str]
    title: str
    is_locked: bool


@dataclass
class SchedulerInputData:
    academic_year_id: str
    academic_year_name: str
    semester_type_id: str
    semester_type_name: str
    classes: List[Dict[str, Any]]
    class_map: Dict[str, Dict[str, Any]]
    slots: List[NormalizedSlot]
    slot_by_key: Dict[Tuple[str, str], NormalizedSlot]
    slot_by_idx: Dict[int, NormalizedSlot]
    working_days: List[Dict[str, Any]]
    teaching_time_slots: List[Dict[str, Any]]
    allocations: List[NormalizedAllocation]
    fixed_slots: List[NormalizedFixedSlot]
    faculty_map: Dict[str, Dict[str, Any]]
    subject_map: Dict[str, Dict[str, Any]]
    resource_map: Dict[str, Dict[str, Any]]
    faculty_availability: Dict[Tuple[str, str, str], str]  # (faculty_id, day_id, slot_id) -> status
    settings: Dict[str, Any]
    class_constraints: Dict[str, Dict[str, Any]]  # class_id -> constraint doc
    faculty_constraints: Dict[str, Dict[str, Any]]  # faculty_id -> constraint doc
    subject_constraints: Dict[Tuple[str, str], Dict[str, Any]]  # (class_id, subject_id) -> doc
    valid_blocks_by_size: Dict[int, List[NormalizedBlock]] = field(default_factory=dict)


@dataclass
class GeneratedEntry:
    class_id: str
    working_day_id: str
    time_slot_id: str
    allocation_id: Optional[str]
    subject_id: Optional[str]
    faculty_ids: List[str]
    resource_id: Optional[str]
    entry_type: str
    title: str
    is_fixed: bool
    is_generated: bool
    block_id: Optional[str] = None
    block_size: int = 1
    block_index: int = 0
    is_locked: bool = False
    is_manually_locked: bool = False


@dataclass
class SchedulerOutput:
    solver_status: str  # OPTIMAL, FEASIBLE, INFEASIBLE, UNKNOWN
    objective_value: Optional[float]
    entries: List[GeneratedEntry]
    diagnostics: List[str]
    duration_ms: int
    stats: Dict[str, Any]
