"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Bell,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ChevronDown,
  Layers,
} from "lucide-react";
import { healthService } from "@/services/health.service";

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const router = useRouter();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    // Check backend health status
    let isMounted = true;
    const checkApi = async () => {
      try {
        const res = await healthService.getHealthStatus();
        if (isMounted) setApiOnline(res.status === "success");
      } catch {
        if (isMounted) setApiOnline(false);
      }
    };
    checkApi();
    const interval = setInterval(checkApi, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200/80 shadow-xs">
      {/* Left side: Hamburger + Term badge */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 rounded-lg hover:text-slate-700 hover:bg-slate-100 lg:hidden focus:outline-none"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-md text-xs">
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span className="font-semibold text-slate-700">Academic Year:</span>
          <span className="text-slate-600 font-mono">2026-2027</span>
          <span className="text-slate-300">|</span>
          <span className="px-1.5 py-0.2 rounded font-semibold text-[10px] bg-indigo-50 text-indigo-700 uppercase">
            Odd Semester
          </span>
        </div>
      </div>

      {/* Right side: API Status + Notifications + Admin Profile */}
      <div className="flex items-center space-x-3">
        {/* Backend Status indicator */}
        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs border border-slate-200 bg-slate-50">
          {apiOnline === true ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-medium text-[11px]">API Online</span>
            </>
          ) : apiOnline === false ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-amber-700 font-medium text-[11px]">API Offline</span>
            </>
          ) : (
            <span className="text-slate-400 text-[11px]">Checking API...</span>
          )}
        </div>

        {/* Notifications Icon */}
        <button
          type="button"
          className="relative p-2 text-slate-500 rounded-lg hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white" />
        </button>

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
          >
            <div className="flex items-center justify-center w-8 h-8 font-semibold text-xs text-white bg-indigo-600 rounded-full shadow-xs">
              AD
            </div>
            <div className="hidden text-left lg:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                Academic Admin
              </div>
              <div className="text-[10px] text-slate-500">
                Department Office
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 z-30 w-48 mt-2 py-1 bg-white border border-slate-200 rounded-xl shadow-lg">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900">
                    Administrator
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    admin@university.edu
                  </p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  System Settings
                </Link>
                <div className="border-t border-slate-100 my-1" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
