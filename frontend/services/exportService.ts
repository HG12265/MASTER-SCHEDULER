import apiClient from "./api";

function triggerBlobDownload(blob: Blob, defaultFilename: string, contentDisposition?: string) {
  let filename = defaultFilename;
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].replace(/['"]/g, "");
    }
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export const exportService = {
  async downloadTimetablePdf(
    timetableId: string,
    params: { view?: "class" | "faculty" | "master"; classId?: string; facultyId?: string } = {}
  ): Promise<void> {
    const res = await apiClient.get(`/timetables/${timetableId}/export/pdf`, {
      params,
      responseType: "blob",
    });
    triggerBlobDownload(
      new Blob([res.data], { type: "application/pdf" }),
      `timetable_${timetableId}_${params.view || "master"}.pdf`,
      res.headers["content-disposition"]
    );
  },

  async downloadTimetableExcel(
    timetableId: string,
    params: { view?: "class" | "faculty" | "master"; classId?: string; facultyId?: string } = {}
  ): Promise<void> {
    const res = await apiClient.get(`/timetables/${timetableId}/export/excel`, {
      params,
      responseType: "blob",
    });
    triggerBlobDownload(
      new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `timetable_${timetableId}_${params.view || "master"}.xlsx`,
      res.headers["content-disposition"]
    );
  },

  async downloadFacultyWorkloadExcel(params: Record<string, any> = {}): Promise<void> {
    const res = await apiClient.get("/reports/faculty-workload/excel", {
      params,
      responseType: "blob",
    });
    triggerBlobDownload(
      new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "faculty_workload_report.xlsx",
      res.headers["content-disposition"]
    );
  },

  async downloadSubjectCoverageExcel(params: Record<string, any> = {}): Promise<void> {
    const res = await apiClient.get("/reports/subject-coverage/excel", {
      params,
      responseType: "blob",
    });
    triggerBlobDownload(
      new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "subject_coverage_report.xlsx",
      res.headers["content-disposition"]
    );
  },

  async downloadResourceUtilizationExcel(params: Record<string, any> = {}): Promise<void> {
    const res = await apiClient.get("/reports/resource-utilization/excel", {
      params,
      responseType: "blob",
    });
    triggerBlobDownload(
      new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "resource_utilization_report.xlsx",
      res.headers["content-disposition"]
    );
  },
};

export default exportService;
