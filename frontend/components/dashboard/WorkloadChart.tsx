"use client";

import React from "react";
import { WorkloadBarData } from "@/services/dashboard.service";

interface WorkloadChartProps {
  data: WorkloadBarData[];
  title?: string;
  className?: string;
}

export const WorkloadChart: React.FC<WorkloadChartProps> = ({
  data,
  title = "Faculty Workload Distribution",
  className = "",
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`p-6 text-center text-sm text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 ${className}`}>
        No faculty workload data available.
      </div>
    );
  }

  // Display top 8 faculty for neat display
  const items = data.slice(0, 8);
  const maxCapacity = Math.max(...items.map((d) => Math.max(d.maxWeeklyHours, d.scheduledHours, 16)), 20);

  return (
    <div
      className={`p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Scheduled periods vs maximum workload limits (Top Faculty)
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 dark:bg-indigo-500" />
            <span className="text-slate-600 dark:text-slate-400">Scheduled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 dark:bg-slate-700" />
            <span className="text-slate-600 dark:text-slate-400">Max Limit</span>
          </div>
        </div>
      </div>

      <div className="space-y-3.5">
        {items.map((item) => {
          const schedPercent = Math.min((item.scheduledHours / maxCapacity) * 100, 100);
          const maxPercent = Math.min((item.maxWeeklyHours / maxCapacity) * 100, 100);
          const isOver = item.scheduledHours > item.maxWeeklyHours && item.maxWeeklyHours > 0;
          const isNearMax = item.utilizationPercent >= 90;

          return (
            <div key={item.facultyId} className="group">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                  {item.facultyName} <span className="text-slate-400">({item.facultyCode})</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                    {item.scheduledHours} / {item.maxWeeklyHours} hrs
                  </span>
                  <span
                    className={`inline-block px-1.5 py-0.2 text-[10px] font-bold rounded-sm ${
                      isOver
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                        : isNearMax
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    }`}
                  >
                    {item.utilizationPercent}%
                  </span>
                </div>
              </div>

              {/* Stacked background track */}
              <div className="relative h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                {/* Max marker background */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-slate-200/80 dark:bg-slate-700/60 rounded-full"
                  style={{ width: `${maxPercent}%` }}
                />
                {/* Scheduled bar */}
                <div
                  className={`absolute top-0 bottom-0 left-0 rounded-full transition-all duration-500 ${
                    isOver
                      ? "bg-rose-500 dark:bg-rose-600"
                      : "bg-indigo-600 dark:bg-indigo-500"
                  }`}
                  style={{ width: `${schedPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkloadChart;
