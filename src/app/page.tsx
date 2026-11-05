"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] p-6 space-y-4">
      <div className="w-12 h-12 border-4 border-[#0F6B4B] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-semibold text-slate-700">Loading Faco Vehicle Mgt App...</p>
    </div>
  );
}
