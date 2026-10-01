from pymongo import ASCENDING, DESCENDING
from app.database.mongodb import get_database
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def create_database_indexes() -> None:
    """
    Safely create necessary unique and query indexes for all core collections on startup.
    """
    db = get_database()
    if db is None:
        logger.warning("Database not available; skipping index initialization.")
        return

    logger.info("Initializing MongoDB indexes...")

    try:
        # academic_years
        await db.academic_years.create_index([("name", ASCENDING)], unique=True, name="uq_academic_years_name")

        # semester_types
        await db.semester_types.create_index([("code", ASCENDING)], unique=True, name="uq_semester_types_code")

        # working_days
        await db.working_days.create_index([("dayOrder", ASCENDING)], name="idx_working_days_day_order")

        # time_slots
        await db.time_slots.create_index([("slotOrder", ASCENDING)], name="idx_time_slots_slot_order")
        await db.time_slots.create_index([("startTime", ASCENDING), ("endTime", ASCENDING)], name="idx_time_slots_times")

        # programmes
        await db.programmes.create_index([("code", ASCENDING)], unique=True, name="uq_programmes_code")
        await db.programmes.create_index([("name", ASCENDING)], name="idx_programmes_name")

        # semesters (compound unique: programmeId + semesterNumber)
        await db.semesters.create_index(
            [("programmeId", ASCENDING), ("semesterNumber", ASCENDING)],
            unique=True,
            name="uq_semesters_programme_number",
        )

        # classes (compound indexing)
        await db.classes.create_index(
            [
                ("academicYearId", ASCENDING),
                ("semesterTypeId", ASCENDING),
                ("programmeId", ASCENDING),
                ("semesterId", ASCENDING),
                ("section", ASCENDING),
            ],
            name="idx_classes_lookup",
        )

        # faculty
        await db.faculty.create_index([("facultyCode", ASCENDING)], unique=True, name="uq_faculty_code")
        await db.faculty.create_index(
            [("email", ASCENDING)],
            unique=True,
            sparse=True,
            name="uq_faculty_email_sparse",
        )
        await db.faculty.create_index([("name", ASCENDING)], name="idx_faculty_name")

        # subjects
        await db.subjects.create_index([("subjectCode", ASCENDING)], unique=True, name="uq_subjects_code")
        await db.subjects.create_index([("programmeId", ASCENDING)], name="idx_subjects_programme")
        await db.subjects.create_index([("semesterId", ASCENDING)], name="idx_subjects_semester")

        # resources
        await db.resources.create_index([("code", ASCENDING)], unique=True, name="uq_resources_code")
        await db.resources.create_index([("resourceType", ASCENDING)], name="idx_resources_type")

        # faculty_subject_allocations
        await db.faculty_subject_allocations.create_index([("classId", ASCENDING)], name="idx_alloc_class")
        await db.faculty_subject_allocations.create_index([("subjectId", ASCENDING)], name="idx_alloc_subject")
        await db.faculty_subject_allocations.create_index([("facultyIds", ASCENDING)], name="idx_alloc_faculty_ids")
        await db.faculty_subject_allocations.create_index(
            [("academicYearId", ASCENDING), ("semesterTypeId", ASCENDING)],
            name="idx_alloc_term",
        )

        # faculty_availability
        await db.faculty_availability.create_index(
            [
                ("academicYearId", ASCENDING),
                ("semesterTypeId", ASCENDING),
                ("facultyId", ASCENDING),
                ("workingDayId", ASCENDING),
                ("timeSlotId", ASCENDING),
            ],
            unique=True,
            name="uq_faculty_avail_slot",
        )
        await db.faculty_availability.create_index(
            [("facultyId", ASCENDING), ("academicYearId", ASCENDING), ("semesterTypeId", ASCENDING)],
            name="idx_faculty_avail_lookup",
        )

        # fixed_timetable_slots
        await db.fixed_timetable_slots.create_index(
            [
                ("academicYearId", ASCENDING),
                ("semesterTypeId", ASCENDING),
                ("classId", ASCENDING),
                ("workingDayId", ASCENDING),
                ("timeSlotId", ASCENDING),
            ],
            unique=True,
            name="uq_fixed_slot_class_time",
        )
        await db.fixed_timetable_slots.create_index(
            [("academicYearId", ASCENDING), ("semesterTypeId", ASCENDING), ("workingDayId", ASCENDING), ("timeSlotId", ASCENDING)],
            name="idx_fixed_slot_term_time",
        )

        # scheduling_settings
        await db.scheduling_settings.create_index(
            [("academicYearId", ASCENDING), ("semesterTypeId", ASCENDING)],
            unique=True,
            name="uq_sched_settings_term",
        )

        # class_constraints
        await db.class_constraints.create_index(
            [("academicYearId", ASCENDING), ("semesterTypeId", ASCENDING), ("classId", ASCENDING)],
            unique=True,
            name="uq_class_constraints_class",
        )

        # faculty_constraints
        await db.faculty_constraints.create_index(
            [("academicYearId", ASCENDING), ("semesterTypeId", ASCENDING), ("facultyId", ASCENDING)],
            unique=True,
            name="uq_faculty_constraints_faculty",
        )

        # subject_constraints
        await db.subject_constraints.create_index(
            [
                ("academicYearId", ASCENDING),
                ("semesterTypeId", ASCENDING),
                ("classId", ASCENDING),
                ("subjectId", ASCENDING),
            ],
            unique=True,
            name="uq_subject_constraints_scoped",
        )

        # timetables
        await db.timetables.create_index(
            [("academicYearId", ASCENDING), ("semesterTypeId", ASCENDING), ("version", DESCENDING)],
            name="idx_timetables_term_version",
        )
        await db.timetables.create_index([("status", ASCENDING)], name="idx_timetables_status")

        # timetable_entries
        await db.timetable_entries.create_index(
            [("timetableId", ASCENDING), ("classId", ASCENDING), ("workingDayId", ASCENDING), ("timeSlotId", ASCENDING)],
            name="idx_entries_grid",
        )
        await db.timetable_entries.create_index(
            [("timetableId", ASCENDING), ("facultyIds", ASCENDING)],
            name="idx_entries_faculty",
        )
        await db.timetable_entries.create_index(
            [("timetableId", ASCENDING), ("resourceId", ASCENDING)],
            name="idx_entries_resource",
        )
        await db.timetable_entries.create_index(
            [("timetableId", ASCENDING), ("blockId", ASCENDING)],
            name="idx_entries_block",
        )

        # timetable_change_history
        await db.timetable_change_history.create_index(
            [("timetableId", ASCENDING), ("performedAt", DESCENDING)],
            name="idx_history_performed",
        )
        await db.timetable_change_history.create_index(
            [("timetableId", ASCENDING), ("revision", DESCENDING)],
            name="idx_history_revision",
        )

        logger.info("Successfully ensured all MongoDB indexes.")
    except Exception as exc:
        logger.warning("Error creating MongoDB indexes: %s", exc)
