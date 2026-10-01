"use client";

import React from "react";
import { Settings } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export default function SettingsPage() {
  return (
    <AdminLayout>
      <PageHeader
        title="System Settings"
        description="Department profile, timetable generation timeout parameters, backup configurations, and administrative security."
        breadcrumbs={[{ label: "System" }, { label: "Settings" }]}
      />
      <EmptyState
        icon={<Settings className="w-8 h-8 text-indigo-600" />}
        title="Department & Engine Settings"
        description="Configure university department identity, default class period duration, CP-SAT maximum solve time, and audit log policies."
      />
    </AdminLayout>
  );
}
