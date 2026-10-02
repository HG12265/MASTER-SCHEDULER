"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Layers,
  CalendarCheck,
  Clock,
  GraduationCap,
  ListOrdered,
  School,
  BookOpen,
  Users,
  UserCheck,
  Building2,
  Cpu,
  CalendarDays,
  Settings,
  X,
  ShieldCheck,
  Lock,
  Sliders,
  UserCheck2,
  BookMarked,
  Activity,
  UserCog,
  FileText,
  Database,
  History,
  AlertTriangle,
  HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  roles?: string[];
  permission?: string;
}

interface NavSection {
  title: string;
  roles?: string[];
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { user, role, hasPermission } = useAuth();

  const userRole = role || (user?.role as string) || "SUPER_ADMIN";

  // Build sections dynamically based on user role
  const getNavSections = (): NavSection[] => {
    // FACULTY Portal view
    if (userRole === "FACULTY") {
      return [
        {
          title: "Faculty Portal",
          items: [
            { name: "My Dashboard", href: "/faculty-portal", icon: LayoutDashboard },
            { name: "My Timetable", href: "/faculty-portal/timetable", icon: Calendar },
            { name: "Leave Requests", href: "/faculty-portal/leave", icon: CalendarCheck },
            { name: "Notifications", href: "/notifications", icon: Activity },
          ],
        },
      ];
    }

    // Default ADMIN / HOD / SUPER_ADMIN view
    const sections: NavSection[] = [
      {
        title: "Overview",
        items: [
          { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        ],
      },
      {
        title: "Daily Operations",
        items: [
          { name: "Operations Hub", href: "/operations", icon: Activity, badge: "Live" },
          { name: "Daily Schedule", href: "/operations/daily", icon: Clock },
          { name: "Leave Management", href: "/operations/leave", icon: CalendarCheck },
          { name: "Substitutions", href: "/operations/substitutions", icon: UserCheck2 },
          { name: "Academic Calendar", href: "/academic-calendar", icon: Calendar },
        ],
      },
      {
        title: "Academic Structure",
        items: [
          { name: "Programmes", href: "/programmes", icon: GraduationCap },
          { name: "Semesters", href: "/semesters", icon: ListOrdered },
          { name: "Classes", href: "/classes", icon: School },
          { name: "Subjects", href: "/subjects", icon: BookOpen },
        ],
      },
      {
        title: "Timing & Resources",
        items: [
          { name: "Academic Years", href: "/academic-years", icon: Calendar },
          { name: "Semester Types", href: "/semester-types", icon: Layers },
          { name: "Working Days", href: "/working-days", icon: CalendarCheck },
          { name: "Time Slots", href: "/time-slots", icon: Clock },
          { name: "Faculty Members", href: "/faculty", icon: Users },
          { name: "Subject Allocation", href: "/faculty-allocations", icon: UserCheck },
          { name: "Rooms & Labs", href: "/resources", icon: Building2 },
        ],
      },
      {
        title: "Scheduler & Constraints",
        items: [
          { name: "Scheduler Overview", href: "/scheduler", icon: Cpu, badge: "Readiness" },
          { name: "Faculty Availability", href: "/faculty-availability", icon: UserCheck },
          { name: "Fixed Slots", href: "/fixed-slots", icon: Lock },
          { name: "Scheduling Settings", href: "/scheduler/settings", icon: Sliders },
          { name: "Class Constraints", href: "/scheduler/class-constraints", icon: School },
          { name: "Faculty Constraints", href: "/scheduler/faculty-constraints", icon: UserCheck2 },
          { name: "Subject Preferences", href: "/scheduler/subject-constraints", icon: BookMarked },
        ],
      },
      {
        title: "Timetables & Views",
        items: [
          { name: "Generated Timetables", href: "/timetables", icon: CalendarDays },
          { name: "Timetable Grid View", href: "/timetable", icon: Calendar },
        ],
      },
      {
        title: "Reports & Analytics",
        items: [
          { name: "Faculty Workload", href: "/reports/faculty-workload", icon: Users },
          { name: "Subject Coverage", href: "/reports/subject-coverage", icon: BookOpen },
          { name: "Resource Utilization", href: "/reports/resource-utilization", icon: Building2 },
          { name: "Substitutions Report", href: "/reports/substitutions", icon: UserCheck2 },
        ],
      },
    ];

    // System Administration section for SUPER_ADMIN
    if (userRole === "SUPER_ADMIN" || hasPermission("users.manage") || hasPermission("backup.manage")) {
      sections.push({
        title: "System Administration",
        items: [
          { name: "User Accounts", href: "/settings/users", icon: UserCog },
          { name: "Institution Header", href: "/settings/institution", icon: ShieldCheck },
          { name: "System Settings", href: "/settings/system", icon: Settings },
          { name: "Backup & Restore", href: "/settings/backup", icon: Database },
          { name: "Audit Logs", href: "/audit-logs", icon: History },
        ],
      });
    }

    return sections;
  };

  const navSections = getNavSections();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-slate-900 text-slate-200 border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header / Brand */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800 bg-slate-950/40">
          <Link
            href={userRole === "FACULTY" ? "/faculty-portal" : "/dashboard"}
            className="flex items-center space-x-3 group"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 group-hover:bg-indigo-500 transition-colors">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white leading-none">
                MASTER SCHEDULER
              </div>
              <div className="text-[10px] text-indigo-400 font-medium tracking-wide mt-1">
                Zero Conflicts.
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items list */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          {navSections.map((section) => (
            <div key={section.title}>
              <div className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                {section.title}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/scheduler" ||
                    item.href === "/dashboard" ||
                    item.href === "/faculty-portal" ||
                    item.href === "/operations"
                      ? pathname === item.href
                      : pathname === item.href ||
                        (pathname?.startsWith(item.href + "/") ?? false);

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => {
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors group",
                        isActive
                          ? "bg-indigo-600 text-white font-semibold shadow-xs shadow-indigo-600/20"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon
                          className={cn(
                            "w-4 h-4 transition-colors",
                            isActive
                              ? "text-white"
                              : "text-slate-400 group-hover:text-slate-200"
                          )}
                        />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-mono font-medium",
                            isActive
                              ? "bg-indigo-500 text-white"
                              : "bg-slate-800 text-indigo-300 border border-indigo-500/20"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer info & system indicator */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/30">
          <div className="flex items-center space-x-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">
                {userRole.replace("_", " ")}
              </p>
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-slate-400 truncate">
                  {user?.username || "Active"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
