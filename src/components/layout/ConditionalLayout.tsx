"use client";

import "@/lib/mobile-api";
import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";

const PUBLIC_PATHS = ["/login", "/qr"];

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isPublic) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
