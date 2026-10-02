"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  CalendarDays,
  Lock,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";


const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid university email format" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@university.edu",
      password: "adminpassword",
      rememberMe: true,
    },
  });

  const { login } = useAuth();

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      await login(data.email, data.password);
      const currentUser = authService.getCurrentUser();
      if (currentUser?.role === "FACULTY") {
        router.push("/faculty-portal");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to authenticate. Please check your credentials.";
      setAuthError(msg);
      setIsSubmitting(false);
    }
  };


  const fillDemoCredentials = () => {
    setValue("email", "admin@university.edu");
    setValue("password", "adminpassword");
  };

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Left Column: Visual University Brand Feature (Hidden on small mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950 border-r border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight text-white leading-none">
              MASTER SCHEDULER
            </div>
            <div className="text-xs text-indigo-400 font-medium tracking-wide mt-1">
              Smart Scheduling. Zero Conflicts.
            </div>
          </div>
        </div>

        <div className="my-auto max-w-lg space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Academic Timetable Engine 2.0</span>
          </div>

          <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight">
            Automated Academic Scheduling for Modern Universities
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed">
            Eliminate scheduling conflicts, streamline department workloads, and generate mathematically optimal academic timetables using constraint programming.
          </p>

          <div className="space-y-3 pt-4">
            <div className="flex items-start space-x-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Zero-Hardcoding Core:</strong> Dynamic Academic Years, Semesters, Programmes, Batches, Subjects, and Rooms.
              </span>
            </div>
            <div className="flex items-start space-x-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>OR-Tools CP-SAT Solver:</strong> Advanced mathematical optimization for hard and soft scheduling constraints.
              </span>
            </div>
            <div className="flex items-start space-x-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Faculty Workload Balancer:</strong> Strict allocation enforcement across theory, practical, and elective slots.
              </span>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-300 flex items-center justify-between border-t border-slate-800/80 pt-6">
          <span>Master Scheduler &copy; {new Date().getFullYear()}</span>
          <span>Department Administration Console</span>
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-slate-900">
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Mobile Header Branding */}
          <div className="lg:hidden flex items-center space-x-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <div className="text-lg font-bold text-white leading-none">
                MASTER SCHEDULER
              </div>
              <div className="text-xs text-indigo-400 mt-0.5">
                Smart Scheduling. Zero Conflicts.
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Administrator Sign In
            </h2>
            <p className="mt-1 text-xs text-slate-300">
              Access the timetable configuration console and solver controls
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center space-x-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5"
              >
                University Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-300">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  placeholder="admin@university.edu"
                  className={`w-full pl-9 pr-3 py-2.5 text-sm bg-slate-800/80 border rounded-lg text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                    errors.email ? "border-rose-500" : "border-slate-700"
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-rose-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5"
              >
                Security Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-300">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register("password")}
                  placeholder="••••••••••••"
                  className={`w-full pl-9 pr-3 py-2.5 text-sm bg-slate-800/80 border rounded-lg text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                    errors.password ? "border-rose-500" : "border-slate-700"
                  }`}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("rememberMe")}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                />
                <span>Remember this terminal</span>
              </label>

              <button
                type="button"
                onClick={fillDemoCredentials}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
              >
                Auto-fill Demo
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Authenticating Administrator...
                </>
              ) : (
                "Sign In to Admin Console"
              )}
            </button>
          </form>

          {/* Quick Notice */}
          <div className="p-3.5 rounded-lg bg-slate-800/40 border border-slate-800 text-slate-300 text-xs">
            <span className="font-semibold text-slate-200">System Note:</span> Master Scheduler is configured for university department administration. Authentication is strictly role-governed.
          </div>
        </div>
      </div>
    </div>
  );
}
