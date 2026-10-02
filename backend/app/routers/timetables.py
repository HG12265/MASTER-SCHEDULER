from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Path, Query, status
from app.schemas.common import BaseResponse, DataResponse
from app.schemas.timetable import (
    TimetableResponse,
    TimetableEntryResponse,
    TimetableMasterViewResponse,
)
from app.services.timetable_generation_service import timetable_generation_service

router = APIRouter(prefix="/timetables", tags=["Timetables & Generation History"])


@router.get(
    "",
    response_model=DataResponse[List[TimetableResponse]],
    summary="List Generated Timetable Versions",
)
async def list_timetables(
    academicYearId: Optional[str] = Query(None, description="Filter by Academic Year ID"),
    semesterTypeId: Optional[str] = Query(None, description="Filter by Semester Type ID"),
    status: Optional[str] = Query(None, description="Filter by status (DRAFT, PUBLISHED, ARCHIVED)"),
):
    timetables = await timetable_generation_service.list_timetables(
        academic_year_id=academicYearId,
        semester_type_id=semesterTypeId,
        status=status,
    )
    return DataResponse(
        message="Timetables retrieved successfully",
        data=timetables,
    )


@router.get(
    "/{id}",
    response_model=DataResponse[TimetableResponse],
    summary="Get Timetable Metadata By ID",
)
async def get_timetable(
    id: str = Path(..., description="ID of timetable"),
):
    timetable = await timetable_generation_service.get_by_id(id)
    return DataResponse(
        message="Timetable retrieved successfully",
        data=timetable,
    )


@router.get(
    "/{id}/entries",
    response_model=DataResponse[List[TimetableEntryResponse]],
    summary="Get Timetable Scheduled Entries",
)
async def get_timetable_entries(
    id: str = Path(..., description="ID of timetable"),
    classId: Optional[str] = Query(None, description="Filter by Class ID"),
    facultyId: Optional[str] = Query(None, description="Filter by Faculty ID"),
    workingDayId: Optional[str] = Query(None, description="Filter by Working Day ID"),
    timeSlotId: Optional[str] = Query(None, description="Filter by Time Slot ID"),
    subjectId: Optional[str] = Query(None, description="Filter by Subject ID"),
    resourceId: Optional[str] = Query(None, description="Filter by Resource ID"),
):
    entries = await timetable_generation_service.get_entries(
        timetable_id=id,
        class_id=classId,
        faculty_id=facultyId,
        working_day_id=workingDayId,
        time_slot_id=timeSlotId,
        subject_id=subjectId,
        resource_id=resourceId,
    )
    return DataResponse(
        message="Timetable entries retrieved successfully",
        data=entries,
    )


@router.get(
    "/{id}/classes/{classId}",
    response_model=DataResponse[List[TimetableEntryResponse]],
    summary="Get Class Timetable Grid Entries",
)
async def get_class_timetable(
    id: str = Path(..., description="ID of timetable"),
    classId: str = Path(..., description="ID of class"),
):
    entries = await timetable_generation_service.get_class_timetable(id, classId)
    return DataResponse(
        message="Class timetable retrieved successfully",
        data=entries,
    )


@router.get(
    "/{id}/faculty/{facultyId}",
    response_model=DataResponse[List[TimetableEntryResponse]],
    summary="Get Faculty Timetable Grid Entries",
)
async def get_faculty_timetable(
    id: str = Path(..., description="ID of timetable"),
    facultyId: str = Path(..., description="ID of faculty"),
):
    entries = await timetable_generation_service.get_faculty_timetable(id, facultyId)
    return DataResponse(
        message="Faculty timetable retrieved successfully",
        data=entries,
    )


@router.get(
    "/{id}/master",
    response_model=DataResponse[TimetableMasterViewResponse],
    summary="Get Master Multi-Class Timetable View",
)
async def get_master_timetable(
    id: str = Path(..., description="ID of timetable"),
):
    data = await timetable_generation_service.get_master_view(id)
    return DataResponse(
        message="Master timetable view retrieved successfully",
        data=data,
    )


@router.delete(
    "/{id}",
    response_model=BaseResponse,
    summary="Delete Draft Timetable Version",
)
async def delete_timetable(
    id: str = Path(..., description="ID of timetable"),
):
    await timetable_generation_service.delete_timetable(id)
    return BaseResponse(message="Draft timetable deleted successfully")


# ============================================================
# PHASE 7: PUBLICATION WORKFLOW ENDPOINTS
# ============================================================

from app.services.timetable_publication_service import timetable_publication_service


@router.post(
    "/{id}/submit-for-approval",
    response_model=DataResponse[TimetableResponse],
    summary="Submit Valid Draft Timetable for Approval",
)
async def submit_for_approval(
    id: str = Path(..., description="ID of timetable"),
):
    tt = await timetable_publication_service.submit_for_approval(id)
    return DataResponse(message="Timetable submitted for approval successfully", data=tt)


@router.post(
    "/{id}/return-to-draft",
    response_model=DataResponse[TimetableResponse],
    summary="Return Timetable Awaiting Approval to Draft",
)
async def return_to_draft(
    id: str = Path(..., description="ID of timetable"),
):
    tt = await timetable_publication_service.return_to_draft(id)
    return DataResponse(message="Timetable returned to draft successfully", data=tt)


@router.post(
    "/{id}/publish",
    response_model=DataResponse[TimetableResponse],
    summary="Publish Official Timetable",
)
async def publish_timetable(
    id: str = Path(..., description="ID of timetable"),
):
    tt = await timetable_publication_service.publish_timetable(id)
    return DataResponse(message="Timetable published successfully as official timetable", data=tt)


@router.post(
    "/{id}/archive",
    response_model=DataResponse[TimetableResponse],
    summary="Archive Timetable",
)
async def archive_timetable(
    id: str = Path(..., description="ID of timetable"),
):
    tt = await timetable_publication_service.archive_timetable(id)
    return DataResponse(message="Timetable archived successfully", data=tt)


@router.post(
    "/{id}/create-draft-copy",
    response_model=DataResponse[TimetableResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create New Draft Copy from Published Timetable",
)
async def create_draft_copy(
    id: str = Path(..., description="ID of timetable"),
):
    tt = await timetable_publication_service.create_draft_copy(id)
    return DataResponse(message="New draft version created from published timetable successfully", data=tt)


# ============================================================
# PHASE 7: EXPORT ENDPOINTS (PDF, EXCEL, HISTORY)
# ============================================================

from fastapi import Response
from app.exports.pdf_export_service import pdf_export_service
from app.exports.excel_export_service import excel_export_service
from app.repositories.export_history_repository import export_history_repo
from app.schemas.export_history import ExportHistoryRecord
from app.repositories.class_repository import class_repo
from app.repositories.faculty_repository import faculty_repo


@router.get(
    "/{id}/export/pdf",
    summary="Export Timetable as PDF (Class, Faculty, or Master)",
)
async def export_timetable_pdf(
    id: str = Path(..., description="Timetable ID"),
    view: str = Query("class", description="View type: class, faculty, or master"),
    classId: Optional[str] = Query(None, description="Class ID if view is class"),
    facultyId: Optional[str] = Query(None, description="Faculty ID if view is faculty"),
):
    clean_view = view.lower().strip()
    if clean_view == "class":
        if not classId:
            # Default to first class in timetable
            entries = await timetable_generation_service.get_entries(id)
            if entries:
                classId = entries[0].classId
            else:
                from app.utils.exceptions import BadRequestException
                raise BadRequestException("Class ID is required for class timetable PDF export")

        cls_doc = await class_repo.get_by_id(classId)
        cls_name = cls_doc.get("name", "Class").replace(" ", "_") if cls_doc else "Class"
        filename = f"{cls_name}_Timetable.pdf"
        buffer = await pdf_export_service.generate_class_timetable_pdf(id, classId)

    elif clean_view == "faculty":
        if not facultyId:
            entries = await timetable_generation_service.get_entries(id)
            for e in entries:
                if e.facultyIds:
                    facultyId = e.facultyIds[0]
                    break
            if not facultyId:
                from app.utils.exceptions import BadRequestException
                raise BadRequestException("Faculty ID is required for faculty timetable PDF export")

        fac_doc = await faculty_repo.get_by_id(facultyId)
        fac_name = fac_doc.get("name", "Faculty").replace(" ", "_") if fac_doc else "Faculty"
        filename = f"{fac_name}_Schedule.pdf"
        buffer = await pdf_export_service.generate_faculty_timetable_pdf(id, facultyId)

    elif clean_view == "master":
        filename = "Master_Timetable.pdf"
        buffer = await pdf_export_service.generate_master_timetable_pdf(id)
    else:
        from app.utils.exceptions import BadRequestException
        raise BadRequestException(f"Unsupported export view '{view}'. Use class, faculty, or master.")

    pdf_bytes = buffer.getvalue()
    await export_history_repo.log_export(
        timetable_id=id,
        export_type="PDF",
        view_type=clean_view,
        filename=filename,
        class_id=classId,
        faculty_id=facultyId,
        file_size_bytes=len(pdf_bytes),
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/{id}/export/excel",
    summary="Export Timetable as Excel XLSX (Class, Faculty, or Master Workbook)",
)
async def export_timetable_excel(
    id: str = Path(..., description="Timetable ID"),
    view: str = Query("master", description="View type: class, faculty, or master"),
    classId: Optional[str] = Query(None, description="Class ID if view is class"),
    facultyId: Optional[str] = Query(None, description="Faculty ID if view is faculty"),
):
    clean_view = view.lower().strip()
    if clean_view == "class":
        if not classId:
            entries = await timetable_generation_service.get_entries(id)
            if entries:
                classId = entries[0].classId
            else:
                from app.utils.exceptions import BadRequestException
                raise BadRequestException("Class ID is required for class timetable Excel export")

        cls_doc = await class_repo.get_by_id(classId)
        cls_name = cls_doc.get("name", "Class").replace(" ", "_") if cls_doc else "Class"
        filename = f"{cls_name}_Timetable.xlsx"
        buffer = await excel_export_service.generate_class_timetable_excel(id, classId)

    elif clean_view == "faculty":
        if not facultyId:
            entries = await timetable_generation_service.get_entries(id)
            for e in entries:
                if e.facultyIds:
                    facultyId = e.facultyIds[0]
                    break
            if not facultyId:
                from app.utils.exceptions import BadRequestException
                raise BadRequestException("Faculty ID is required for faculty timetable Excel export")

        fac_doc = await faculty_repo.get_by_id(facultyId)
        fac_name = fac_doc.get("name", "Faculty").replace(" ", "_") if fac_doc else "Faculty"
        filename = f"{fac_name}_Schedule.xlsx"
        buffer = await excel_export_service.generate_faculty_timetable_excel(id, facultyId)

    elif clean_view == "master":
        filename = "Master_Timetable_Workbook.xlsx"
        buffer = await excel_export_service.generate_master_workbook_excel(id)
    else:
        from app.utils.exceptions import BadRequestException
        raise BadRequestException(f"Unsupported export view '{view}'. Use class, faculty, or master.")

    excel_bytes = buffer.getvalue()
    await export_history_repo.log_export(
        timetable_id=id,
        export_type="EXCEL",
        view_type=clean_view,
        filename=filename,
        class_id=classId,
        faculty_id=facultyId,
        file_size_bytes=len(excel_bytes),
    )

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/{id}/export-history",
    response_model=DataResponse[List[ExportHistoryRecord]],
    summary="Get Timetable Export Audit History",
)
async def get_export_history(
    id: str = Path(..., description="Timetable ID"),
    limit: int = Query(50, ge=1, le=100),
):
    history = await export_history_repo.get_history_by_timetable(id, limit=limit)
    return DataResponse(message="Export history retrieved successfully", data=history)


