import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  size?: "small" | "medium" | "large";
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading data...",
  size = "medium",
}) => {
  const sizeClasses = {
    small: "w-5 h-5",
    medium: "w-8 h-8",
    large: "w-12 h-12",
  };

  return (
    <div className="flex flex-col items-center justify-center p-10 space-y-3 bg-white/60 backdrop-blur-xs rounded-xl border border-slate-100">
      <Loader2
        className={`${sizeClasses[size]} text-indigo-600 animate-spin`}
      />
      <p className="text-sm font-medium text-slate-600 animate-pulse">
        {message}
      </p>
    </div>
  );
};

export default LoadingState;
