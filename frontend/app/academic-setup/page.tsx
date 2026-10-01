"use client";

import React from "react";
import Link from "next/link";
import { Calendar, Layers, CalendarCheck, Clock, ArrowRight } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";

const setupModules = [
  {
    title: "Academic Years",
    description: "Manage academic cycles, start/end date boundaries, and declare the active current academic year.",
    href: "/academic-years",
    icon: Calendar,
    color: "from-blue-500 to-indigo-600",
  },
  {
    title: "Semester Types",
    description: "Configure ODD and EVEN semester terms to coordinate department curriculum delivery.",
    href: "/semester-types",
    icon: Layers,
    color: "from-purple-500 to-indigo-600",
  },
  {
    title: "Working Days",
    description: "Set up the university weekly operational calendar (Monday-Friday/Saturday) and non-teaching days.",
    href: "/working-days",
    icon: CalendarCheck,
    color: "from-emerald-500 to-teal-600",
  },
  {
    title: "Time Slots",
    description: "Define daily period hours, morning/afternoon breaks, and lunch duration for timetable grids.",
    href: "/time-slots",
    icon: Clock,
    color: "from-amber-500 to-orange-600",
  },
];

export default function AcademicSetupPage() {
  return (
    <AdminLayout>
      <PageHeader
        title="Calendar & Timing Setup"
        description="Configure core academic timeframes, operational working days, and daily period schedules."
        breadcrumbs={[{ label: "Overview" }, { label: "Calendar & Timing Setup" }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {setupModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className="group p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} text-white flex items-center justify-center shadow-md mb-4 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {mod.title}
                </h3>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  {mod.description}
                </p>
              </div>

              <div className="mt-6 flex items-center text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform">
                <span>Configure {mod.title}</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </AdminLayout>
  );
}
