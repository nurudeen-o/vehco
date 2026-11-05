import { getApiBaseUrl, isApiPath, isNativePlatform, resolveApiUrl, toPath } from "./offline/config";
import { offlineRequest } from "./offline/request";
import { startSyncEngine } from "./offline/sync";

export { getApiBaseUrl, resolveApiUrl };

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
  const native = isNativePlatform();

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let raw: string | null = null;
    if (typeof input === "string") raw = input;
    else if (input instanceof URL) raw = input.pathname + input.search + input.hash;

    if (raw !== null) {
      const path = toPath(raw);
      if (!isApiPath(path)) return originalFetch(input, init);

      const base = getApiBaseUrl();
      const remote = Boolean(base);
      const url = remote ? `${base}${path}` : path;

      if (native) {
        return offlineRequest({
          path,
          url,
          method: (init?.method || "GET").toUpperCase(),
          init,
          fetchImpl: originalFetch,
          remote,
        });
      }

      const modifiedInit: RequestInit = { ...init };
      if (remote && !modifiedInit.credentials) {
        modifiedInit.credentials = "include";
      }
      return originalFetch(remote ? url : raw, modifiedInit);
    }

    if (typeof Request !== "undefined" && input instanceof Request) {
      try {
        const parsed = new URL(input.url);
        if (isApiPath(parsed.pathname)) {
          const base = getApiBaseUrl();
          if (base) {
            const resolved = `${base}${parsed.pathname}${parsed.search}${parsed.hash}`;
            return originalFetch(new Request(resolved, input));
          }
        }
      } catch {}
    }

    return originalFetch(input, init);
  };

  if (native) startSyncEngine();

  if (typeof document !== "undefined") {
    document.addEventListener(
      "click",
      (event) => {
        const target = (event.target as HTMLElement)?.closest?.("a");
        if (!target) return;
        const href = target.getAttribute("href");
        if (href && isApiPath(href)) {
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
