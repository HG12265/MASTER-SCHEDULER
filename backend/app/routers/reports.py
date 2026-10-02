from typing import Optional
from fastapi import APIRouter, Query, Response
from app.schemas.common import DataResponse
from app.schemas.reports import (
    ClassLoadReport,
    FacultyWorkloadReport,
    ResourceUtilizationReport,
    SubjectCoverageReport,
)
from app.services.report_service import report_service

router = APIRouter(prefix="/reports", tags=["Academic Reports & Analytics"])


@router.get(
    "/faculty-workload",
    response_model=DataResponse[FacultyWorkloadReport],
    summary="Get Faculty Workload Report",
)
async def get_faculty_workload_report(
    academicYearId: Optional[str] = Query(None, description="Academic Year ID"),
    semesterTypeId: Optional[str] = Query(None, description="Semester Type ID"),
    timetableId: Optional[str] = Query(None, description="Specific Timetable ID"),
    facultyId: Optional[str] = Query(None, description="Filter single faculty ID"),
):
    report = await report_service.get_faculty_workload_report(
        academic_year_id=academicYearId,
        semester_type_id=semesterTypeId,
        timetable_id=timetableId,
        faculty_id=facultyId,
    )
    return DataResponse(message="Faculty workload report generated successfully", data=report)


@router.get(
    "/subject-coverage",
    response_model=DataResponse[SubjectCoverageReport],
    summary="Get Subject Coverage Report",
)
async def get_subject_coverage_report(
    academicYearId: Optional[str] = Query(None, description="Academic Year ID"),
    semesterTypeId: Optional[str] = Query(None, description="Semester Type ID"),
    timetableId: Optional[str] = Query(None, description="Specific Timetable ID"),
    classId: Optional[str] = Query(None, description="Filter single class ID"),
):
    report = await report_service.get_subject_coverage_report(
        academic_year_id=academicYearId,
        semester_type_id=semesterTypeId,
        timetable_id=timetableId,
        class_id=classId,
    )
    return DataResponse(message="Subject coverage report generated successfully", data=report)


@router.get(
    "/class-load",
    response_model=DataResponse[ClassLoadReport],
    summary="Get Class Scheduled Load Report",
)
async def get_class_load_report(
    academicYearId: Optional[str] = Query(None, description="Academic Year ID"),
    semesterTypeId: Optional[str] = Query(None, description="Semester Type ID"),
    timetableId: Optional[str] = Query(None, description="Specific Timetable ID"),
):
    report = await report_service.get_class_load_report(
        academic_year_id=academicYearId,
        semester_type_id=semesterTypeId,
        timetable_id=timetableId,
    )
    return DataResponse(message="Class load report generated successfully", data=report)


@router.get(
    "/resource-utilization",
    response_model=DataResponse[ResourceUtilizationReport],
    summary="Get Classroom and Laboratory Utilization Report",
)
async def get_resource_utilization_report(
    academicYearId: Optional[str] = Query(None, description="Academic Year ID"),
    semesterTypeId: Optional[str] = Query(None, description="Semester Type ID"),
    timetableId: Optional[str] = Query(None, description="Specific Timetable ID"),
    resourceType: Optional[str] = Query(None, description="Filter by type (CLASSROOM, LAB)"),
):
    report = await report_service.get_resource_utilization_report(
        academic_year_id=academicYearId,
        semester_type_id=semesterTypeId,
        timetable_id=timetableId,
        resource_type=resourceType,
    )
    return DataResponse(message="Resource utilization report generated successfully", data=report)


# ============================================================
# REPORT EXCEL EXPORTS
# ============================================================

from app.exports.excel_export_service import excel_export_service


@router.get(
    "/faculty-workload/export/excel",
    summary="Export Faculty Workload Report as Excel XLSX",
)
async def export_faculty_workload_excel(
    academicYearId: Optional[str] = Query(None),
    semesterTypeId: Optional[str] = Query(None),
    timetableId: Optional[str] = Query(None),
):
    buffer = await excel_export_service.generate_faculty_workload_report_excel(
        academic_year_id=academicYearId,
        semester_type_id=semesterTypeId,
        timetable_id=timetableId,
    )
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="Faculty_Workload_Report.xlsx"'},
    )


@router.get(
    "/subject-coverage/export/excel",
    summary="Export Subject Coverage Report as Excel XLSX",
)
async def export_subject_coverage_excel(
    academicYearId: Optional[str] = Query(None),
    semesterTypeId: Optional[str] = Query(None),
    timetableId: Optional[str] = Query(None),
):
    buffer = await excel_export_service.generate_subject_coverage_report_excel(
        academic_year_id=academicYearId,
        semester_type_id=semesterTypeId,
        timetable_id=timetableId,
    )
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="Subject_Coverage_Report.xlsx"'},
    )


@router.get(
    "/resource-utilization/export/excel",
    summary="Export Resource Utilization Report as Excel XLSX",
)
async def export_resource_utilization_excel(
    academicYearId: Optional[str] = Query(None),
    semesterTypeId: Optional[str] = Query(None),
    timetableId: Optional[str] = Query(None),
):
    buffer = await excel_export_service.generate_resource_utilization_report_excel(
        academic_year_id=academicYearId,
        semester_type_id=semesterTypeId,
        timetable_id=timetableId,
    )
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="Resource_Utilization_Report.xlsx"'},
    )


# ============================================================
# PHASE 8 OPERATIONAL REPORTS
# ============================================================

from app.schemas.reports import SubstitutionReport, FacultyOperationalWorkloadReport


@router.get(
    "/substitutions",
    response_model=DataResponse[SubstitutionReport],
    summary="Get Substitutions Report",
)
async def get_substitutions_report(
    startDate: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    endDate: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    facultyId: Optional[str] = Query(None, description="Faculty ID"),
    classId: Optional[str] = Query(None, description="Class ID"),
    status: Optional[str] = Query(None, description="Status (ASSIGNED, CANCELLED)"),
):
    report = await report_service.get_substitutions_report(
        start_date=startDate,
        end_date=endDate,
        faculty_id=facultyId,
        class_id=classId,
        status_filter=status,
    )
    return DataResponse(message="Substitutions report generated successfully", data=report)


@router.get(
    "/operational-workload",
    response_model=DataResponse[FacultyOperationalWorkloadReport],
    summary="Get Faculty Operational Workload Report",
)
async def get_operational_workload_report(
    startDate: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    endDate: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    facultyId: Optional[str] = Query(None, description="Faculty ID"),
):
    report = await report_service.get_operational_workload_report(
        start_date=startDate,
        end_date=endDate,
        faculty_id=facultyId,
    )
    return DataResponse(message="Faculty operational workload report generated successfully", data=report)


