"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Car,
  Users,
  Wrench,
  DollarSign,
  FileText,
  CheckSquare,
  BarChart3,
  Settings,
  X,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasPermission, type PermissionKey } from "@/lib/permissions";
import { AppLogo } from "@/components/shared/AppLogo";

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  permission?: PermissionKey;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navigation: NavGroup[] = [
  {
    label: "Overview",
    items: [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Fleet",
    items: [
      { name: "Vehicles", href: "/vehicles", icon: Car, permission: "VIEW_VEHICLES" },
      { name: "Drivers", href: "/drivers", icon: Users, permission: "VIEW_DRIVERS" },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Maintenance", href: "/maintenance", icon: Wrench, permission: "VIEW_MAINTENANCE_RECORDS" },
      { name: "Expenses", href: "/expenses", icon: DollarSign, permission: "VIEW_EXPENSES" },
      { name: "Documents", href: "/documents", icon: FileText, permission: "VIEW_DOCUMENTS" },
      { name: "Inquiries", href: "/messages", icon: MessageSquare },
    ],
  },
  {
    label: "Governance",
    items: [
      { name: "Approvals", href: "/approvals", icon: CheckSquare, permission: "VIEW_APPROVALS" },
      { name: "Analytics", href: "/analytics", icon: BarChart3, permission: "VIEW_ANALYTICS" },
      { name: "Reports", href: "/reports", icon: FileText, permission: "EXPORT_REPORTS" },
      {
        name: "Settings",
        href: "/settings",
        icon: Settings,
        permission: "VIEW_SETTINGS",
      },
    ],
  },
];

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermissionKey[] | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.role) setRole(data.user.role);
        if (data?.permissions) setPermissions(data.permissions);
      })
      .catch(() => {
        setRole(null);
        setPermissions(null);
      });
  }, []);

  const isItemVisible = (item: NavItem) => {
    if (!item.permission) return true;
    if (permissions) return permissions.includes(item.permission);
    // Fallback before session loads
    if (!role) return false;
    return hasPermission(role, item.permission);
  };

  return (
    <aside
      className={cn(
        "bg-slate-900 text-white flex flex-col no-print z-50",
        "lg:sticky lg:top-0 lg:translate-x-0 lg:w-[16.5rem] lg:h-screen lg:shrink-0 lg:overflow-y-auto",
        "fixed inset-y-0 left-0 w-[min(17.5rem,88vw)] min-h-screen",
        "border-r border-slate-800/80 shadow-xl lg:shadow-none",
        "transition-transform duration-300 ease-out",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <AppLogo size={44} showText dark className="min-w-0" />
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto overscroll-contain">
        <div className="space-y-5">
          {navigation.map((group) => {
            const visibleItems = group.items.filter(isItemVisible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label}>
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive =
                      pathname === item.href || pathname.startsWith(item.href + "/");
                    const Icon = item.icon;
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors",
                            "active:scale-[0.99]",
                            isActive
                              ? "bg-[#0F6B4B] text-white shadow-sm"
                              : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                          )}
                        >
                          {isActive && (
                            <span
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#F4B400]"
                              aria-hidden
                            />
                          )}
                          <span
                            className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors",
                              isActive
                                ? "bg-white/15 text-white"
                                : "bg-slate-800/80 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-700/80"
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="truncate">{item.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800">
        <div className="rounded-xl bg-slate-800/60 px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-200 truncate">Enterprise v1.0</p>
            <p className="text-[10px] text-slate-500 truncate">System online</p>
          </div>
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
          </span>
        </div>
      </div>
    </aside>
  );
}
