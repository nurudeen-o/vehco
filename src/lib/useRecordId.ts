"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";

function readQueryId(): string {
  if (typeof window === "undefined") return "";
  try {
    return new URLSearchParams(window.location.search).get("id") || "";
  } catch {
    return "";
  }
}

export function useRecordId(): string {
  const params = useParams<{ id?: string }>();
  const pathname = usePathname();
  const [queryId, setQueryId] = useState<string>(readQueryId);

  useEffect(() => {
    const next = readQueryId();
    setQueryId((prev) => (prev === next ? prev : next));
  }, [pathname]);

  const paramId = typeof params?.id === "string" ? params.id : "";
  return paramId && paramId !== "_placeholder" ? paramId : queryId;
}
