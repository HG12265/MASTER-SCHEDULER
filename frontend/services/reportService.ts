import apiClient from "./api";
import {
  FacultyWorkloadReportResponse,
  SubjectCoverageReportResponse,
  ClassLoadReportResponse,
  ResourceUtilizationReportResponse,
  ReportFilterParams,
  ApiResponse,
} from "@/types";

export const reportService = {
  async getFacultyWorkload(params?: ReportFilterParams): Promise<FacultyWorkloadReportResponse> {
    const res = await apiClient.get<ApiResponse<FacultyWorkloadReportResponse>>(
      "/reports/faculty-workload",
      { params }
    );
    return res.data.data;
  },

  async getSubjectCoverage(params?: ReportFilterParams): Promise<SubjectCoverageReportResponse> {
    const res = await apiClient.get<ApiResponse<SubjectCoverageReportResponse>>(
      "/reports/subject-coverage",
      { params }
    );
    return res.data.data;
  },

  async getClassLoad(params?: ReportFilterParams): Promise<ClassLoadReportResponse> {
    const res = await apiClient.get<ApiResponse<ClassLoadReportResponse>>(
      "/reports/class-load",
      { params }
    );
    return res.data.data;
  },

  async getResourceUtilization(params?: ReportFilterParams): Promise<ResourceUtilizationReportResponse> {
    const res = await apiClient.get<ApiResponse<ResourceUtilizationReportResponse>>(
      "/reports/resource-utilization",
      { params }
    );
    return res.data.data;
  },

  async getSubstitutions(params?: {
    startDate?: string;
    endDate?: string;
    facultyId?: string;
    classId?: string;
    status?: string;
  }): Promise<any> {
    const res = await apiClient.get<ApiResponse<any>>("/reports/substitutions", { params });
    return res.data.data;
  },

  async getOperationalWorkload(params?: {
    startDate?: string;
    endDate?: string;
    facultyId?: string;
  }): Promise<any> {
    const res = await apiClient.get<ApiResponse<any>>("/reports/operational-workload", { params });
    return res.data.data;
  },
};

export default reportService;
