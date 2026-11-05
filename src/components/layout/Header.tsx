"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, LogOut, Menu } from "lucide-react";
import { getRoleLabel } from "@/lib/permissions";
import { useShell } from "./AppShell";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";

export function Header({ title }: { title?: string }) {
  const router = useRouter();
  const { toggleSidebar } = useShell();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {
        setUser(null);
      });
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="bg-white border-b border-slate-200 h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between no-print sticky top-0 z-30">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="lg:hidden p-2 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-base sm:text-xl font-bold text-slate-800 tracking-tight truncate">
          {title || "Fleet Operations"}
        </h2>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-4">
        {/* Offline & Sync Status */}
        <SyncStatusBadge />

        {/* Desktop search */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vehicle code, driver..."
            className="pl-9 pr-4 py-1.5 text-sm bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6B4B] w-48 lg:w-64"
          />
        </div>

        {/* Mobile search toggle */}
        <button
          type="button"
          onClick={() => setSearchOpen((v) => !v)}
          className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        <button
          type="button"
          className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
        </button>

        {user && (
          <div className="flex items-center gap-2 sm:gap-3 pl-1.5 sm:pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-[#0F6B4B] text-white flex items-center justify-center text-sm font-semibold shrink-0">
              {getInitials(user.name)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight">
                {user.name}
              </p>
              <p className="text-[10px] text-slate-500">{getRoleLabel(user.role)}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile search bar expand */}
      {searchOpen && (
        <div className="absolute left-0 right-0 top-full border-b border-slate-200 bg-white p-3 md:hidden shadow-sm">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Search vehicle code, driver..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6B4B]"
            />
          </div>
        </div>
      )}
    </header>
  );
}
