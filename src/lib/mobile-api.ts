import { Capacitor } from "@capacitor/core";

const DEFAULT_API_URL = "https://vehico.vercel.app";

export const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    return DEFAULT_API_URL;
  }
  return "";
};

export const resolveApiUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    if (
      path.startsWith("http://localhost/api/") ||
      path.startsWith("https://localhost/api/") ||
      path.startsWith("capacitor://localhost/api/")
    ) {
      const pathSuffix = path.replace(/^(?:https?|capacitor):\/\/localhost/, "");
      return resolveApiUrl(pathSuffix);
    }
    return path;
  }
  if (!path.startsWith("/api/") && path !== "/api") {
    return path;
  }
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
};

export function initMobileApiBridge(): void {
  if (typeof window === "undefined" || typeof window.fetch !== "function") {
    return;
  }

  const win = window as unknown as { __mobileApiBridgeInitialized?: boolean };
  if (win.__mobileApiBridgeInitialized) {
    return;
  }
  win.__mobileApiBridgeInitialized = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let targetInput = input;

    if (typeof input === "string") {
      if (
        input.startsWith("/api/") ||
        input === "/api" ||
        input.startsWith("http://localhost/api/") ||
        input.startsWith("https://localhost/api/") ||
        input.startsWith("capacitor://localhost/api/")
      ) {
        targetInput = resolveApiUrl(input);
      }
    } else if (input instanceof URL) {
      if (input.pathname.startsWith("/api/") || input.pathname === "/api") {
        targetInput = new URL(resolveApiUrl(input.pathname + input.search + input.hash));
      }
    } else if (typeof Request !== "undefined" && input instanceof Request) {
      try {
        const urlObj = new URL(input.url);
        if (urlObj.pathname.startsWith("/api/") || urlObj.pathname === "/api") {
          const resolved = resolveApiUrl(urlObj.pathname + urlObj.search + urlObj.hash);
          targetInput = new Request(resolved, input);
        }
      } catch {
        targetInput = input;
      }
    }

    const modifiedInit: RequestInit = { ...init };
    if (Capacitor.isNativePlatform() || getApiBaseUrl()) {
      if (!modifiedInit.credentials) {
        modifiedInit.credentials = "include";
      }
    }

    return originalFetch(targetInput, modifiedInit);
  };

  if (typeof document !== "undefined") {
    document.addEventListener(
      "click",
      (event) => {
        const target = (event.target as HTMLElement)?.closest?.("a");
        if (!target) return;
        const href = target.getAttribute("href");
        if (href && (href.startsWith("/api/") || href === "/api")) {
          const resolved = resolveApiUrl(href);
          if (resolved !== href) {
            target.setAttribute("href", resolved);
          }
        }
      },
      true
    );
  }
}

if (typeof window !== "undefined") {
  initMobileApiBridge();
}
