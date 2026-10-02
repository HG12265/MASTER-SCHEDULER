"use client";

import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { notificationService } from "@/services";
import { AppNotification } from "@/types";
import { useToast } from "@/components/Toast";
import {
  Bell,
  CheckCircle2,
  Clock,
  CheckCheck,
  Calendar,
  AlertTriangle,
  UserCheck,
  FileCheck,
} from "lucide-react";

export default function NotificationsInboxPage() {
  const toast = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications(100);
      setNotifications(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // Non-fatal
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch (err: any) {
      toast.error("Failed to mark all as read");
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const filteredNotifications =
    filter === "UNREAD" ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <AdminLayout>
      <PageHeader
        title="Notifications Inbox"
        description="Stay informed with real-time updates regarding leave approvals, substitute assignments, timetable publications, and system alerts."
        breadcrumbs={[{ label: "Notifications" }]}
        action={
          unreadCount > 0 ? (
            <button
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark All as Read ({unreadCount})
            </button>
          ) : undefined
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 mb-6">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            filter === "ALL"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          All Notifications ({notifications.length})
        </button>

        <button
          onClick={() => setFilter("UNREAD")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            filter === "UNREAD"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Unread Only ({unreadCount})
        </button>
      </div>

      {/* Notification List */}
      <div className="space-y-3 max-w-4xl">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            <Bell className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            {filter === "UNREAD"
              ? "You have zero unread notifications."
              : "No notifications in your inbox."}
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.isRead) handleMarkAsRead(n.id);
              }}
              className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                !n.isRead
                  ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50 shadow-2xs cursor-pointer"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-90"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    n.type.includes("LEAVE")
                      ? "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-200"
                      : n.type.includes("SUBSTITUTION")
                      ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-200"
                      : "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-200"
                  }`}
                >
                  {n.type.includes("LEAVE") ? (
                    <FileCheck className="w-4 h-4" />
                  ) : n.type.includes("SUBSTITUTION") ? (
                    <UserCheck className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      {n.title}
                    </h4>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs mt-1">
                    {n.message}
                  </p>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {!n.isRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(n.id);
                  }}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                >
                  Mark as Read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
