"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Car,
  Users,
  Fuel,
  Wrench,
  DollarSign,
  FileText,
  CheckSquare,
  BarChart3,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  permission?: "VIEW_SETTINGS";
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
      { name: "Vehicles", href: "/vehicles", icon: Car },
      { name: "Drivers", href: "/drivers", icon: Users },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Fuel Tracking", href: "/fuel", icon: Fuel },
      { name: "Maintenance", href: "/maintenance", icon: Wrench },
      { name: "Expenses", href: "/expenses", icon: DollarSign },
      { name: "Documents", href: "/documents", icon: FileText },
    ],
  },
  {
    label: "Governance",
    items: [
      { name: "Approvals", href: "/approvals", icon: CheckSquare },
      { name: "Reports", href: "/reports", icon: BarChart3 },
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

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.role) setRole(data.user.role);
      })
      .catch(() => setRole(null));
  }, []);

  const isItemVisible = (item: NavItem) => {
    if (!item.permission) return true;
    if (!role) return false;
    return hasPermission(role, item.permission);
  };

  return (
    <aside
      className={cn(
        "bg-slate-900 text-white flex flex-col no-print z-50",
        "lg:static lg:translate-x-0 lg:w-[16.5rem] lg:min-h-screen lg:shrink-0",
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
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-[#0F6B4B] flex items-center justify-center font-bold text-white text-lg shadow-sm ring-1 ring-white/10">
                vC
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900"
                aria-hidden
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-[1.05rem] leading-tight tracking-tight text-white">
                vehi<span className="text-[#F4B400]">CO</span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">Fleet Management</p>
            </div>
          </div>
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
