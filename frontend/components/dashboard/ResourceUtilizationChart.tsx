"use client";

import React from "react";
import { ResourceBarData } from "@/services/dashboard.service";

interface ResourceUtilizationChartProps {
  data: ResourceBarData[];
  title?: string;
  className?: string;
}

export const ResourceUtilizationChart: React.FC<ResourceUtilizationChartProps> = ({
  data,
  title = "Room & Lab Utilization",
  className = "",
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`p-6 text-center text-sm text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 ${className}`}>
        No resource utilization data available.
      </div>
    );
  }

  const items = data.slice(0, 8);

  return (
    <div
      className={`p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Occupied teaching periods across available weekly slots
          </p>
        </div>
      </div>

      <div className="space-y-3.5">
        {items.map((item) => {
          const isLab = (item.resourceType || "").toUpperCase() === "LAB";
          const percent = item.utilizationPercent;

          return (
            <div key={item.resourceId}>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                      isLab
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                    }`}
                  >
                    {item.resourceType}
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {item.resourceName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {item.usedSlots} / {item.availableSlots} slots
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                    {percent}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isLab ? "bg-purple-500 dark:bg-purple-600" : "bg-blue-500 dark:bg-blue-600"
                  }`}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResourceUtilizationChart;
