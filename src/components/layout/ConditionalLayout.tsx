"use client";

import "@/lib/mobile-api";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "./AppShell";

const PUBLIC_PATHS = ["/login", "/qr"];

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (isPublic) return;
    let cancelled = false;

    fetch("/api/auth/session")
      .then(async (res) => {
        if (!res.ok) return null;
        try {
          return await res.json();
        } catch {
          return null;
        }
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.authenticated && data?.user) {
          setAuthed(true);
        } else {
          router.replace("/login");
        }
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });

    return () => {
      cancelled = true;
    };
  }, [isPublic, router]);

  if (isPublic) {
    return <>{children}</>;
  }

  if (!authed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] p-6">
        <div className="w-12 h-12 border-4 border-[#0F6B4B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
