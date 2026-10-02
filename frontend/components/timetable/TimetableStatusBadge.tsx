import React from "react";
import { cn } from "@/lib/utils";

interface TimetableStatusBadgeProps {
  status: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const TimetableStatusBadge: React.FC<TimetableStatusBadgeProps> = ({
  status,
  className,
  size = "md",
}) => {
  const normStatus = (status || "").toUpperCase();

  const configMap: Record<
    string,
    { bg: string; text: string; border: string; dot: string; label: string }
  > = {
    DRAFT: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      text: "text-amber-700 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800",
      dot: "bg-amber-500",
      label: "Draft",
    },
    READY_FOR_APPROVAL: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      text: "text-blue-700 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800",
      dot: "bg-blue-500",
      label: "Ready for Approval",
    },
    PUBLISHED: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      text: "text-emerald-700 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800",
      dot: "bg-emerald-500",
      label: "Official Published",
    },
    ARCHIVED: {
      bg: "bg-slate-100 dark:bg-slate-800/40",
      text: "text-slate-600 dark:text-slate-400",
      border: "border-slate-200 dark:border-slate-700",
      dot: "bg-slate-400",
      label: "Archived",
    },
  };

  const current = configMap[normStatus] || {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
    label: normStatus || "Unknown",
  };

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3 py-1.5 font-medium",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium border shadow-2xs",
        current.bg,
        current.text,
        current.border,
        sizeClasses[size],
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", current.dot)} />
      {current.label}
    </span>
  );
};

export const ValidationStatusBadge: React.FC<{
  status?: string;
  className?: string;
  size?: "sm" | "md";
}> = ({ status, className, size = "md" }) => {
  const norm = (status || "").toUpperCase();
  const isValid = norm === "VALID";
  const isInvalid = norm === "INVALID";

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-0.5",
  };

  if (isValid) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
          sizeClasses[size],
          className
        )}
      >
        <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        Valid
      </span>
    );
  }

  if (isInvalid) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-semibold border bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800",
          sizeClasses[size],
          className
        )}
      >
        <svg className="w-3 h-3 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Invalid
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
        sizeClasses[size],
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Needs Validation
    </span>
  );
};

export default TimetableStatusBadge;
