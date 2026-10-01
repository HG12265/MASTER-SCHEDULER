import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { StatCardProps } from "@/types";
import { cn } from "@/lib/utils";

const accentStyles = {
  indigo: {
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    border: "border-indigo-100",
    dot: "bg-indigo-500",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    border: "border-emerald-100",
    dot: "bg-emerald-500",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-100",
    dot: "bg-amber-500",
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-100",
    dot: "bg-blue-500",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    border: "border-purple-100",
    dot: "bg-purple-500",
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  trend = "neutral",
  icon,
  description,
  accent = "indigo",
}) => {
  const styles = accentStyles[accent] || accentStyles.indigo;

  return (
    <div className="relative overflow-hidden transition-all duration-200 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs hover:shadow-md hover:border-slate-300 group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
          {title}
        </span>
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg transition-transform duration-200 group-hover:scale-105",
            styles.bg,
            styles.text
          )}
        >
          {icon}
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </span>
        {change && (
          <span
            className={cn(
              "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full",
              trend === "up" && "bg-emerald-50 text-emerald-700",
              trend === "down" && "bg-rose-50 text-rose-700",
              trend === "neutral" && "bg-slate-100 text-slate-600"
            )}
          >
            {trend === "up" && <TrendingUp className="w-3 h-3 mr-1" />}
            {trend === "down" && <TrendingDown className="w-3 h-3 mr-1" />}
            {trend === "neutral" && <Minus className="w-3 h-3 mr-1" />}
            {change}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-2 text-xs text-slate-500 font-normal">
          {description}
        </p>
      )}

      {/* Decorative accent top bar */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
          styles.dot
        )}
      />
    </div>
  );
};

export default StatCard;
