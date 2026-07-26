"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

type ShellContextValue = {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    return {
      sidebarOpen: false,
      openSidebar: () => {},
      closeSidebar: () => {},
      toggleSidebar: () => {},
    };
  }
  return ctx;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const value: ShellContextValue = {
    sidebarOpen,
    openSidebar: () => setSidebarOpen(true),
    closeSidebar: () => setSidebarOpen(false),
    toggleSidebar: () => setSidebarOpen((v) => !v),
  };

  return (
    <ShellContext.Provider value={value}>
      <div className="flex w-full">
        {/* Mobile overlay */}
        <div
          className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[1px] transition-opacity duration-200 lg:hidden ${
            sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden={!sidebarOpen}
        />

        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 flex flex-col min-w-0 bg-slate-50 w-full h-screen overflow-y-auto lg:ml-0">
          {children}
        </main>
      </div>
    </ShellContext.Provider>
  );
}
