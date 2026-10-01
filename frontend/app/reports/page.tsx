"use client";

import React from "react";
import { BarChart3 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export default function ReportsPage() {
  return (
    <AdminLayout>
      <PageHeader
        title="Reports & Analytics"
        description="Faculty workload reports, subject contact hours summaries, PDF timetable export, and Excel spreadsheets."
        breadcrumbs={[{ label: "Timetable Engine" }, { label: "Reports" }]}
      />
      <EmptyState
        icon={<BarChart3 className="w-8 h-8 text-indigo-600" />}
        title="Reporting & Department Exports"
        description="Comprehensive audit reports including Faculty Workload variance, room utilization rates, and one-click PDF & Excel timetable printouts."
      />
    </AdminLayout>
  );
}
