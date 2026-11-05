import { cacheGet, cachePut, queueAdd } from "./db";
import { invalidateResource, notifySync, setOnline } from "./sync";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const LIST_ENTITIES = ["vehicles", "drivers", "expenses", "maintenance"];

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function detailKey(path: string, item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const id = (item as { id?: unknown }).id;
  if (typeof id !== "string" || !id) return null;
  const match = path.split("?")[0].match(/^\/api\/([a-z-]+)$/);
  if (!match || !LIST_ENTITIES.includes(match[1])) return null;
  return `/api/${match[1]}/${id}`;
}

async function cachePayload(path: string, data: unknown): Promise<void> {
  await cachePut(path, data);

  if (!Array.isArray(data)) return;
  const keys = data
    .map((item) => detailKey(path, item))
    .filter((key): key is string => Boolean(key));
  await Promise.all(keys.map((key, index) => cachePut(key, data[index])));
}

export type OfflineRequestArgs = {
  path: string;
  url: string;
  method: string;
  init?: RequestInit;
  fetchImpl: typeof fetch;
  remote: boolean;
};

export async function offlineRequest({
  path,
  url,
  method,
  init,
  fetchImpl,
  remote,
}: OfflineRequestArgs): Promise<Response> {
  const body = init?.body ?? null;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  if (method === "GET") {
    if (remote) {
      try {
        const response = await fetchImpl(url, {
          ...init,
          credentials: init?.credentials ?? "include",
        });
        setOnline(true);
        if (response.ok) {
          const type = response.headers.get("content-type") || "";
          if (type.includes("application/json")) {
            try {
              const data = await response.clone().json();
              await cachePayload(path, data);
            } catch {}
          }
        }
        return response;
      } catch {
        setOnline(false);
      }
    }
    const cached = await cacheGet<unknown>(path).catch(() => undefined);
    if (cached !== undefined) return jsonResponse(cached, 200);
    return jsonResponse(
      {
        error: remote
          ? "You are offline. This data has not been synced to this device yet."
          : "No sync server is configured for this build.",
      },
      503
    );
  }

  if (!MUTATION_METHODS.has(method)) {
    return fetchImpl(url, init);
  }

  if (remote) {
    try {
      const response = await fetchImpl(url, {
        ...init,
        credentials: init?.credentials ?? "include",
      });
      setOnline(true);
      if (response.ok) await invalidateResource(path);
      return response;
    } catch {
      setOnline(false);
    }
  }

  if (path.startsWith("/api/auth/")) {
    return jsonResponse(
      {
        error: remote
          ? "Could not reach the sync server. Check your internet connection and the server address."
          : "No sync server is configured for this build.",
      },
      503
    );
  }

  if (isForm) {
    return jsonResponse(
      {
        error:
          "File uploads require an internet connection. Save the records now and attach files when you are online.",
      },
      503
    );
  }

  const localId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  await queueAdd({
    id: localId,
    seq: Date.now() + Math.random(),
    method,
    path,
    body: typeof body === "string" ? body : null,
    createdAt: Date.now(),
    localId,
    error: null,
  });
  notifySync();

  return jsonResponse({ success: true, offline: true, id: localId, queued: true }, 202);
}
