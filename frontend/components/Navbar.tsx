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
  Check,
  ExternalLink,
} from "lucide-react";
import { healthService } from "@/services/health.service";
import { notificationService } from "@/services/notificationService";
import { useAuth } from "@/context/AuthContext";
import { AppNotification } from "@/types";

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifs, setRecentNotifs] = useState<AppNotification[]>([]);

  const fetchNotifications = async () => {
    try {
      const [count, notifs] = await Promise.all([
        notificationService.getUnreadCount(),
        notificationService.getNotifications(6),
      ]);
      setUnreadCount(count);
      setRecentNotifs(notifs);
    } catch {
      // Suppress if not authenticated yet
    }
  };

  useEffect(() => {
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
    fetchNotifications();

    const interval = setInterval(() => {
      checkApi();
      fetchNotifications();
    }, 20000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    setUnreadCount(0);
    setRecentNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const initials = user?.username
    ? user.username.substring(0, 2).toUpperCase()
    : "AD";

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

      {/* Right side: API Status + Notifications + User Profile */}
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

        {/* Notifications Icon & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifMenuOpen(!notifMenuOpen);
              setUserMenuOpen(false);
            }}
            className="relative p-2 text-slate-500 rounded-lg hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-indigo-600 rounded-full ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setNotifMenuOpen(false)}
              />
              <div className="absolute right-0 z-30 w-80 sm:w-96 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-700 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {recentNotifs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    recentNotifs.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs transition-colors hover:bg-slate-50 ${
                          !n.isRead ? "bg-indigo-50/40" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-800 leading-snug">
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-slate-600 mt-0.5 text-[11px] line-clamp-2">
                          {n.message}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {new Date(n.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <Link
                    href="/notifications"
                    onClick={() => setNotifMenuOpen(false)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    View All Notifications <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setNotifMenuOpen(false);
            }}
            className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
          >
            <div className="flex items-center justify-center w-8 h-8 font-bold text-xs text-white bg-indigo-600 rounded-full shadow-xs">
              {initials}
            </div>
            <div className="hidden text-left lg:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                {user?.username || "Academic User"}
              </div>
              <div className="text-[10px] text-slate-500">
                {user?.role ? user.role.replace("_", " ") : "Administrator"}
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
              <div className="absolute right-0 z-30 w-52 mt-2 py-1 bg-white border border-slate-200 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900">
                    {user?.username || "User"}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {user?.email || "user@university.edu"}
                  </p>
                  <span className="inline-block mt-1 px-1.5 py-0.2 rounded font-semibold text-[9px] bg-indigo-50 text-indigo-700 uppercase">
                    {user?.role || "ADMIN"}
                  </span>
                </div>

                {user?.role !== "FACULTY" && (
                  <Link
                    href="/settings/system"
                    onClick={() => setUserMenuOpen(false)}
                    className="block px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    System Settings
                  </Link>
                )}

                {user?.role === "FACULTY" && (
                  <Link
                    href="/faculty-portal"
                    onClick={() => setUserMenuOpen(false)}
                    className="block px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Faculty Portal
                  </Link>
                )}

                <div className="border-t border-slate-100 my-1" />
                <button
                  type="button"
                  onClick={logout}
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
