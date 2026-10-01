"use client";

import React, { useEffect, useState } from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { timetablesService } from "@/services/timetables";

export default function TimetablePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkLatestTimetable() {
      try {
        const timetables = await timetablesService.getAll();
        if (timetables && timetables.length > 0) {
          // Redirect to the latest generated timetable
          router.replace(`/timetables/${timetables[0].id}`);
          return;
        }
      } catch (err) {
        console.error("Failed to load timetables", err);
      } finally {
        setLoading(false);
      }
    }
    checkLatestTimetable();
  }, [router]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-24 text-center text-slate-400 text-xs">
          Loading timetable...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Timetable Views"
        description="Comprehensive timetable visualization across Class-wise, Faculty-wise, Day-wise, and Department Master grid matrices."
        breadcrumbs={[{ label: "Timetables & Views" }, { label: "Grid View" }]}
      />
      <EmptyState
        icon={<CalendarDays className="w-8 h-8 text-indigo-600" />}
        title="No Timetables Generated Yet"
        description="Run the Google OR-Tools CP-SAT automatic scheduler engine to generate mathematically optimal, conflict-free academic timetables."
        action={{
          label: "Go to Scheduler Engine",
          onClick: () => router.push("/scheduler"),
        }}
      />
    </AdminLayout>
  );
}
