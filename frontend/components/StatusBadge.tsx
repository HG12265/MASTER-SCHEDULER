import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  isActive?: boolean;
  isCurrent?: boolean;
  type?: string;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  isActive,
  isCurrent,
  type,
  label,
  className,
}) => {
  // If isCurrent is present and true
  if (isCurrent) {
    return (
      <span
        className={cn(
          "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 tracking-wide uppercase shadow-2xs",
          className
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5 animate-pulse" />
        Current
      </span>
    );
  }

  // If specific slot/subject type badge
  if (type) {
    const typeUpper = type.toUpperCase();
    const typeStyles: Record<string, string> = {
      PERIOD: "bg-blue-50 text-blue-700 border-blue-200",
      BREAK: "bg-amber-50 text-amber-700 border-amber-200",
      LUNCH: "bg-purple-50 text-purple-700 border-purple-200",
      THEORY: "bg-blue-50 text-blue-700 border-blue-200",
      LAB: "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold",
      TUTORIAL: "bg-orange-50 text-orange-700 border-orange-200",
      CLASSROOM: "bg-slate-100 text-slate-700 border-slate-200",
    };

    const style = typeStyles[typeUpper] || "bg-slate-100 text-slate-700 border-slate-200";

    return (
      <span
        className={cn(
          "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border",
          style,
          className
        )}
      >
        {label || typeUpper}
      </span>
    );
  }

  // Active / Inactive status
  const active = isActive !== false;
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border",
        active
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-slate-100 text-slate-500 border-slate-200",
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full mr-1.5",
          active ? "bg-emerald-500" : "bg-slate-400"
        )}
      />
      {label || (active ? "Active" : "Inactive")}
    </span>
  );
};

export default StatusBadge;
