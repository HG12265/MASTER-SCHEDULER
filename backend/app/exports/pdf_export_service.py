import io
from datetime import datetime
from typing import Any, Dict, List, Optional
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from app.repositories.academic_year_repository import academic_year_repo
from app.repositories.class_repository import class_repo
from app.repositories.faculty_repository import faculty_repo
from app.repositories.institution_settings_repository import institution_settings_repo
from app.repositories.resource_repository import resource_repo
from app.repositories.semester_type_repository import semester_type_repo
from app.repositories.subject_repository import subject_repo
from app.repositories.time_slot_repository import time_slot_repo
from app.repositories.timetable_repository import timetable_entry_repo, timetable_repo
from app.repositories.working_day_repository import working_day_repo
from app.utils.exceptions import NotFoundException, BadRequestException


class NumberedCanvas:
    """Helper to draw footer and page numbers if needed."""
    pass


class PdfExportService:
    def __init__(self):
        self.page_width, self.page_height = landscape(A4)

    def _get_styles(self):
        styles = getSampleStyleSheet()
        normal = styles["Normal"]

        inst_style = ParagraphStyle(
            "InstitutionHeader",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=18,
            alignment=1,  # Center
            textColor=colors.HexColor("#1e3a8a"),  # Deep Navy
        )

        dept_style = ParagraphStyle(
            "DepartmentHeader",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            alignment=1,
            textColor=colors.HexColor("#334155"),
        )

        title_style = ParagraphStyle(
            "AcademicTitle",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            alignment=1,
            textColor=colors.HexColor("#0f172a"),
        )

        meta_style = ParagraphStyle(
            "MetaText",
            parent=normal,
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            alignment=1,
            textColor=colors.HexColor("#475569"),
        )

        cell_subj_style = ParagraphStyle(
            "CellSubject",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            alignment=1,
            textColor=colors.HexColor("#0f172a"),
        )

        cell_fac_style = ParagraphStyle(
            "CellFaculty",
            parent=normal,
            fontName="Helvetica",
            fontSize=7,
            leading=9,
            alignment=1,
            textColor=colors.HexColor("#1e3a8a"),
        )

        cell_room_style = ParagraphStyle(
            "CellRoom",
            parent=normal,
            fontName="Helvetica",
            fontSize=6.5,
            leading=8,
            alignment=1,
            textColor=colors.HexColor("#059669"),
        )

        header_cell_style = ParagraphStyle(
            "HeaderCell",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            alignment=1,
            textColor=colors.white,
        )

        legend_title_style = ParagraphStyle(
            "LegendTitle",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#1e293b"),
        )

        legend_text_style = ParagraphStyle(
            "LegendText",
            parent=normal,
            fontName="Helvetica",
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor("#334155"),
        )

        signature_style = ParagraphStyle(
            "SignatureStyle",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11,
            alignment=1,
            textColor=colors.HexColor("#1e293b"),
        )

        footer_note_style = ParagraphStyle(
            "FooterNote",
            parent=normal,
            fontName="Helvetica-Oblique",
            fontSize=7,
            leading=9,
            alignment=1,
            textColor=colors.HexColor("#94a3b8"),
        )

        return {
            "inst": inst_style,
            "dept": dept_style,
            "title": title_style,
            "meta": meta_style,
            "cell_subj": cell_subj_style,
            "cell_fac": cell_fac_style,
            "cell_room": cell_room_style,
            "header_cell": header_cell_style,
            "legend_title": legend_title_style,
            "legend_text": legend_text_style,
            "signature": signature_style,
            "footer_note": footer_note_style,
        }

    def _build_header_elements(
        self,
        inst_settings: Dict[str, Any],
        styles: Dict[str, ParagraphStyle],
        subtitle: str,
        term_text: str,
    ) -> List[Any]:
        elements = []
        inst_name = inst_settings.get("institutionName", "Master University").upper()
        dept_name = inst_settings.get("departmentName", "Department of Computer Science")
        acad_title = inst_settings.get("academicTitle", "CLASS TIME TABLE").upper()

        elements.append(Paragraph(inst_name, styles["inst"]))
        elements.append(Spacer(1, 2))
        elements.append(Paragraph(dept_name, styles["dept"]))
        elements.append(Spacer(1, 2))

        addr = inst_settings.get("addressLine1")
        if addr:
            addr2 = inst_settings.get("addressLine2")
            full_addr = f"{addr}, {addr2}" if addr2 else addr
            elements.append(Paragraph(full_addr, styles["meta"]))
            elements.append(Spacer(1, 2))

        elements.append(Spacer(1, 3))
        elements.append(Paragraph(f"<b>{acad_title} — {subtitle}</b>", styles["title"]))
        elements.append(Spacer(1, 2))
        elements.append(Paragraph(term_text, styles["meta"]))
        elements.append(Spacer(1, 6))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=6))
        return elements

    def _build_footer_elements(
        self,
        inst_settings: Dict[str, Any],
        styles: Dict[str, ParagraphStyle],
    ) -> List[Any]:
        elements = []
        prep_label = inst_settings.get("preparedByLabel", "Time Table Coordinator")
        hod_name = inst_settings.get("hodName", "Head of Department")
        appr_label = inst_settings.get("approvedByLabel", "Principal / Dean")

        sig_data = [
            [
                Paragraph(f"<br/><br/>_______________________<br/><b>{prep_label}</b>", styles["signature"]),
                Paragraph(f"<br/><br/>_______________________<br/><b>{hod_name}</b>", styles["signature"]),
                Paragraph(f"<br/><br/>_______________________<br/><b>{appr_label}</b>", styles["signature"]),
            ]
        ]
        sig_table = Table(sig_data, colWidths=[250, 250, 250])
        sig_table.setStyle(
            TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        elements.append(Spacer(1, 8))
        elements.append(sig_table)

        footer_text = inst_settings.get(
            "footerText", "Generated by Master Scheduler • Smart Scheduling. Zero Conflicts."
        )
        gen_time = datetime.now().strftime("%d-%b-%Y %I:%M %p")
        full_footer = f"{footer_text} | Printed: {gen_time}"
        elements.append(Spacer(1, 6))
        elements.append(Paragraph(full_footer, styles["footer_note"]))
        return elements

    async def generate_class_timetable_pdf(self, timetable_id: str, class_id: str) -> io.BytesIO:
        tt = await timetable_repo.get_by_id(timetable_id)
        if not tt:
            raise NotFoundException(f"Timetable with ID '{timetable_id}' not found")

        cls_doc = await class_repo.get_by_id(class_id)
        if not cls_doc:
            raise NotFoundException(f"Class with ID '{class_id}' not found")

        inst_settings = await institution_settings_repo.get_settings()
        styles = self._get_styles()

        # Load master structure
        working_days = await working_day_repo.find_many({"isActive": True, "isWorkingDay": True}, sort=[("dayOrder", 1)])
        time_slots = await time_slot_repo.find_many({"isActive": True}, sort=[("slotOrder", 1)])

        entries = await timetable_entry_repo.find_many({"timetableId": timetable_id, "classId": class_id, "isActive": True})

        # Preload subjects, faculty, resources
        subjects = await subject_repo.find_many({"isActive": True})
        subj_map = {s["id"]: s for s in subjects}
        faculty_all = await faculty_repo.find_many({"isActive": True})
        fac_map = {f["id"]: f for f in faculty_all}
        resources = await resource_repo.find_many({"isActive": True})
        res_map = {r["id"]: r for r in resources}

        # Grid lookup: (day_id, slot_id) -> entry
        grid_map: Dict[Tuple[str, str], Dict[str, Any]] = {}
        used_subjects: Dict[str, Dict[str, Any]] = {}
        used_faculty: Dict[str, Dict[str, Any]] = {}

        for e in entries:
            key = (e.get("workingDayId"), e.get("timeSlotId"))
            grid_map[key] = e
            sid = e.get("subjectId")
            if sid and sid in subj_map:
                used_subjects[sid] = subj_map[sid]
            for fid in e.get("facultyIds", []):
                if fid in fac_map:
                    used_faculty[fid] = fac_map[fid]

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            leftMargin=24,
            rightMargin=24,
            topMargin=20,
            bottomMargin=20,
        )

        elements = []

        # Term description
        ay_doc = await academic_year_repo.get_by_id(tt["academicYearId"])
        st_doc = await semester_type_repo.get_by_id(tt["semesterTypeId"])
        ay_name = ay_doc.get("name", "2026-2027") if ay_doc else "2026-2027"
        st_name = st_doc.get("name", "Academic Term") if st_doc else "Academic Term"
        cls_name = cls_doc.get("displayName") or cls_doc.get("name", "Class")
        subtitle = f"{cls_name}"
        term_text = f"Academic Year: {ay_name} | {st_name} | Timetable Version: v{tt.get('version', 1)} ({tt.get('status', 'DRAFT')})"

        elements.extend(self._build_header_elements(inst_settings, styles, subtitle, term_text))

        # Build Timetable Grid
        # Column headers: Day + Time Slots
        header_row = [Paragraph("<b>DAY / TIME</b>", styles["header_cell"])]
        for ts in time_slots:
            s_name = ts.get("name", "")
            s_time = f"{ts.get('startTime', '')} - {ts.get('endTime', '')}"
            if ts.get("slotType") in ("BREAK", "LUNCH"):
                s_name = f"{s_name} ({ts.get('slotType')})"
            header_row.append(Paragraph(f"<b>{s_name}</b><br/>{s_time}", styles["header_cell"]))

        table_data = [header_row]

        for wd in working_days:
            row = [Paragraph(f"<b>{wd.get('name', 'Day')}</b>", styles["cell_subj"])]
            for ts in time_slots:
                if ts.get("slotType") in ("BREAK", "LUNCH"):
                    row.append(Paragraph(f"<b>{ts.get('name')}</b>", styles["cell_fac"]))
                    continue

                entry = grid_map.get((wd["id"], ts["id"]))
                if entry:
                    sid = entry.get("subjectId")
                    s_code = subj_map.get(sid, {}).get("subjectCode", entry.get("title", "SUBJ")) if sid else entry.get("title", "ACTIVITY")
                    fac_codes = [fac_map[fid].get("facultyCode") or fac_map[fid].get("name", "")[:12] for fid in entry.get("facultyIds", []) if fid in fac_map]
                    fac_str = ", ".join(fac_codes)
                    rid = entry.get("resourceId")
                    room_str = res_map.get(rid, {}).get("code", "") if rid else ""

                    cell_content = f"<b>{s_code}</b>"
                    if fac_str:
                        cell_content += f"<br/>{fac_str}"
                    if room_str:
                        cell_content += f"<br/><font color='#059669'>[{room_str}]</font>"
                    row.append(Paragraph(cell_content, styles["cell_subj"]))
                else:
                    row.append(Paragraph("<font color='#94a3b8'>—</font>", styles["cell_subj"]))
            table_data.append(row)

        # Calculate dynamic column widths
        avail_width = self.page_width - 48
        num_cols = len(time_slots) + 1
        day_col_width = 75
        slot_col_width = (avail_width - day_col_width) / max(1, len(time_slots))
        col_widths = [day_col_width] + [slot_col_width] * len(time_slots)

        grid_table = Table(table_data, colWidths=col_widths, repeatRows=1)
        grid_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#1e3a8a")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        elements.append(grid_table)
        elements.append(Spacer(1, 8))

        # Legend Table: Subjects and Faculty
        if used_subjects or used_faculty:
            legend_rows = []
            max_rows = max(len(used_subjects), len(used_faculty))
            subj_list = list(used_subjects.values())
            fac_list = list(used_faculty.values())

            legend_header = [
                Paragraph("<b>Subject Code</b>", styles["legend_title"]),
                Paragraph("<b>Subject Title</b>", styles["legend_title"]),
                Paragraph("<b>Staff Code</b>", styles["legend_title"]),
                Paragraph("<b>Faculty Name</b>", styles["legend_title"]),
            ]
            legend_rows.append(legend_header)

            for i in range(max_rows):
                s = subj_list[i] if i < len(subj_list) else None
                f = fac_list[i] if i < len(fac_list) else None
                s_code = s.get("subjectCode", "") if s else ""
                s_name = s.get("name", "") if s else ""
                f_code = f.get("facultyCode", "") if f else ""
                f_name = f.get("name", "") if f else ""
                legend_rows.append([
                    Paragraph(s_code, styles["legend_text"]),
                    Paragraph(s_name, styles["legend_text"]),
                    Paragraph(f_code, styles["legend_text"]),
                    Paragraph(f_name, styles["legend_text"]),
                ])

            legend_table = Table(legend_rows, colWidths=[90, 280, 80, 280])
            legend_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ])
            )
            elements.append(KeepTogether([Paragraph("<b>COURSE & FACULTY LEGEND</b>", styles["legend_title"]), Spacer(1, 3), legend_table]))

        elements.extend(self._build_footer_elements(inst_settings, styles))

        doc.build(elements)
        buffer.seek(0)
        return buffer

    async def generate_faculty_timetable_pdf(self, timetable_id: str, faculty_id: str) -> io.BytesIO:
        tt = await timetable_repo.get_by_id(timetable_id)
        if not tt:
            raise NotFoundException(f"Timetable with ID '{timetable_id}' not found")

        fac_doc = await faculty_repo.get_by_id(faculty_id)
        if not fac_doc:
            raise NotFoundException(f"Faculty with ID '{faculty_id}' not found")

        inst_settings = await institution_settings_repo.get_settings()
        styles = self._get_styles()

        working_days = await working_day_repo.find_many({"isActive": True, "isWorkingDay": True}, sort=[("dayOrder", 1)])
        time_slots = await time_slot_repo.find_many({"isActive": True}, sort=[("slotOrder", 1)])

        entries = await timetable_entry_repo.find_many({"timetableId": timetable_id, "facultyIds": faculty_id, "isActive": True})

        subjects = await subject_repo.find_many({"isActive": True})
        subj_map = {s["id"]: s for s in subjects}
        classes = await class_repo.find_many({"isActive": True})
        cls_map = {c["id"]: c for c in classes}
        resources = await resource_repo.find_many({"isActive": True})
        res_map = {r["id"]: r for r in resources}

        grid_map: Dict[Tuple[str, str], Dict[str, Any]] = {}
        for e in entries:
            grid_map[(e.get("workingDayId"), e.get("timeSlotId"))] = e

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            leftMargin=24,
            rightMargin=24,
            topMargin=20,
            bottomMargin=20,
        )

        elements = []
        ay_doc = await academic_year_repo.get_by_id(tt["academicYearId"])
        st_doc = await semester_type_repo.get_by_id(tt["semesterTypeId"])
        ay_name = ay_doc.get("name", "2026-2027") if ay_doc else "2026-2027"
        st_name = st_doc.get("name", "Academic Term") if st_doc else "Academic Term"

        fac_name = fac_doc.get("name", "Faculty")
        fac_desig = fac_doc.get("designation", "Faculty")
        fac_code = fac_doc.get("facultyCode", "")
        subtitle = f"FACULTY INDIVIDUAL SCHEDULE — {fac_name} ({fac_code}, {fac_desig})"
        term_text = f"Academic Year: {ay_name} | {st_name} | Timetable Version: v{tt.get('version', 1)}"

        elements.extend(self._build_header_elements(inst_settings, styles, subtitle, term_text))

        # Grid
        header_row = [Paragraph("<b>DAY / TIME</b>", styles["header_cell"])]
        for ts in time_slots:
            s_name = ts.get("name", "")
            s_time = f"{ts.get('startTime', '')} - {ts.get('endTime', '')}"
            if ts.get("slotType") in ("BREAK", "LUNCH"):
                s_name = f"{s_name} ({ts.get('slotType')})"
            header_row.append(Paragraph(f"<b>{s_name}</b><br/>{s_time}", styles["header_cell"]))

        table_data = [header_row]

        for wd in working_days:
            row = [Paragraph(f"<b>{wd.get('name', 'Day')}</b>", styles["cell_subj"])]
            for ts in time_slots:
                if ts.get("slotType") in ("BREAK", "LUNCH"):
                    row.append(Paragraph(f"<b>{ts.get('name')}</b>", styles["cell_fac"]))
                    continue

                entry = grid_map.get((wd["id"], ts["id"]))
                if entry:
                    cid = entry.get("classId")
                    c_name = cls_map.get(cid, {}).get("name", "Class")
                    sid = entry.get("subjectId")
                    s_code = subj_map.get(sid, {}).get("subjectCode", entry.get("title", "SUBJ")) if sid else entry.get("title", "")
                    rid = entry.get("resourceId")
                    room_str = f"[{res_map.get(rid, {}).get('code', '')}]" if rid else ""

                    cell_content = f"<b>{c_name}</b><br/>{s_code} {room_str}"
                    row.append(Paragraph(cell_content, styles["cell_subj"]))
                else:
                    row.append(Paragraph("<font color='#94a3b8'>—</font>", styles["cell_subj"]))
            table_data.append(row)

        avail_width = self.page_width - 48
        day_col_width = 75
        slot_col_width = (avail_width - day_col_width) / max(1, len(time_slots))
        col_widths = [day_col_width] + [slot_col_width] * len(time_slots)

        grid_table = Table(table_data, colWidths=col_widths, repeatRows=1)
        grid_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#0f766e")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        elements.append(grid_table)
        elements.append(Spacer(1, 10))

        # Workload metrics
        sched_count = len([e for e in entries if e.get("entryType") == "SUBJECT"])
        fixed_count = len([e for e in entries if e.get("entryType") != "SUBJECT"])
        total_hours = sched_count + fixed_count

        workload_data = [
            [
                Paragraph("<b>Total Scheduled Teaching Hours:</b>", styles["legend_title"]),
                Paragraph(f"<b>{sched_count} hrs/week</b>", styles["legend_text"]),
                Paragraph("<b>Institutional / Fixed Activities:</b>", styles["legend_title"]),
                Paragraph(f"<b>{fixed_count} hrs/week</b>", styles["legend_text"]),
                Paragraph("<b>Total Weekly Commitment:</b>", styles["legend_title"]),
                Paragraph(f"<b>{total_hours} hrs/week</b>", styles["legend_text"]),
            ]
        ]
        wl_table = Table(workload_data, colWidths=[160, 80, 160, 80, 160, 80])
        wl_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        elements.append(KeepTogether([wl_table]))

        elements.extend(self._build_footer_elements(inst_settings, styles))

        doc.build(elements)
        buffer.seek(0)
        return buffer

    async def generate_master_timetable_pdf(self, timetable_id: str) -> io.BytesIO:
        tt = await timetable_repo.get_by_id(timetable_id)
        if not tt:
            raise NotFoundException(f"Timetable with ID '{timetable_id}' not found")

        inst_settings = await institution_settings_repo.get_settings()
        styles = self._get_styles()

        working_days = await working_day_repo.find_many({"isActive": True, "isWorkingDay": True}, sort=[("dayOrder", 1)])
        time_slots = await time_slot_repo.find_many({"isActive": True, "isTeachingSlot": True}, sort=[("slotOrder", 1)])

        classes = await class_repo.find_many(
            {"academicYearId": tt["academicYearId"], "semesterTypeId": tt["semesterTypeId"], "isActive": True},
            sort=[("name", 1)],
        )
        all_entries = await timetable_entry_repo.find_many({"timetableId": timetable_id, "isActive": True})

        subjects = await subject_repo.find_many({"isActive": True})
        subj_map = {s["id"]: s for s in subjects}
        faculty_all = await faculty_repo.find_many({"isActive": True})
        fac_map = {f["id"]: f for f in faculty_all}

        # (dayId, classId, slotId) -> entry
        master_grid: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
        for e in all_entries:
            master_grid[(e.get("workingDayId"), e.get("classId"), e.get("timeSlotId"))] = e

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            leftMargin=20,
            rightMargin=20,
            topMargin=18,
            bottomMargin=18,
        )

        elements = []
        ay_doc = await academic_year_repo.get_by_id(tt["academicYearId"])
        st_doc = await semester_type_repo.get_by_id(tt["semesterTypeId"])
        ay_name = ay_doc.get("name", "2026-2027") if ay_doc else "2026-2027"
        st_name = st_doc.get("name", "Academic Term") if st_doc else "Academic Term"

        # One section per Working Day (scalable and clean)
        for d_idx, wd in enumerate(working_days):
            day_name = wd.get("name", "Day").upper()
            subtitle = f"MASTER TIMETABLE — {day_name}"
            term_text = f"Academic Year: {ay_name} | {st_name} | Timetable Version: v{tt.get('version', 1)}"

            elements.extend(self._build_header_elements(inst_settings, styles, subtitle, term_text))

            header_row = [Paragraph("<b>CLASS</b>", styles["header_cell"])]
            for ts in time_slots:
                s_name = ts.get("name", "")
                s_time = f"{ts.get('startTime', '')} - {ts.get('endTime', '')}"
                header_row.append(Paragraph(f"<b>{s_name}</b><br/>{s_time}", styles["header_cell"]))

            table_data = [header_row]

            for c in classes:
                cid = c["id"]
                c_name = c.get("name", "Class")
                row = [Paragraph(f"<b>{c_name}</b>", styles["cell_subj"])]

                for ts in time_slots:
                    entry = master_grid.get((wd["id"], cid, ts["id"]))
                    if entry:
                        sid = entry.get("subjectId")
                        s_code = subj_map.get(sid, {}).get("subjectCode", entry.get("title", "SUBJ")) if sid else entry.get("title", "")
                        fac_codes = [fac_map[fid].get("facultyCode") or fac_map[fid].get("name", "")[:8] for fid in entry.get("facultyIds", []) if fid in fac_map]
                        fac_str = ", ".join(fac_codes)
                        cell_content = f"<b>{s_code}</b>"
                        if fac_str:
                            cell_content += f"<br/><font color='#1e3a8a'>{fac_str}</font>"
                        row.append(Paragraph(cell_content, styles["cell_subj"]))
                    else:
                        row.append(Paragraph("<font color='#cbd5e1'>—</font>", styles["cell_subj"]))
                table_data.append(row)

            avail_width = self.page_width - 40
            class_col_width = 80
            slot_col_width = (avail_width - class_col_width) / max(1, len(time_slots))
            col_widths = [class_col_width] + [slot_col_width] * len(time_slots)

            grid_table = Table(table_data, colWidths=col_widths, repeatRows=1)
            grid_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#334155")),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ])
            )
            elements.append(grid_table)
            elements.extend(self._build_footer_elements(inst_settings, styles))

            if d_idx < len(working_days) - 1:
                elements.append(PageBreak())

        doc.build(elements)
        buffer.seek(0)
        return buffer


pdf_export_service = PdfExportService()
