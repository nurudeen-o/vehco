import { Capacitor } from "@capacitor/core";

const FALLBACK_API_URL = "";

export function isNativePlatform(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export function getApiBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL || "").trim() || FALLBACK_API_URL;
  return configured.replace(/\/+$/, "");
}

export function resolveApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    if (
      path.startsWith("http://localhost/api/") ||
      path.startsWith("https://localhost/api/") ||
      path.startsWith("capacitor://localhost/api/")
    ) {
      const suffix = path.replace(/^(?:https?|capacitor):\/\/localhost/, "");
      return resolveApiUrl(suffix);
    }
    return path;
  }
  if (!path.startsWith("/api/") && path !== "/api") {
    return path;
  }
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
}

export function isApiPath(path: string): boolean {
  return path.startsWith("/api/") || path === "/api";
}

export function toPath(input: string): string {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    try {
      const parsed = new URL(input);
      return parsed.pathname + parsed.search + parsed.hash;
    } catch {
      return input;
    }
  }
  return input;
}
