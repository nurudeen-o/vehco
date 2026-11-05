import { Network } from "@capacitor/network";
import {
  cacheDelete,
  cacheKeys,
  failedAdd,
  failedCount,
  metaGet,
  metaSet,
  queueAll,
  queueCount,
  queueDelete,
} from "./db";
import { getApiBaseUrl, isNativePlatform } from "./config";

export type SyncSummary = {
  online: boolean;
  pending: number;
  failed: number;
  lastSyncedAt: number | null;
};

const listeners = new Set<() => void>();
let flushing = false;
let started = false;
let online = typeof navigator !== "undefined" ? navigator.onLine : true;

export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifySync(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {}
  });
}

export function setOnline(value: boolean): void {
  if (online === value) return;
  online = value;
  notifySync();
}

export function isOnline(): boolean {
  return online;
}

function resourceRoot(path: string): string {
  const parts = path.split("?")[0].split("/").filter(Boolean);
  return parts.length >= 2 ? `/${parts[0]}/${parts[1]}` : path;
}

export async function invalidateResource(path: string): Promise<void> {
  try {
    const root = resourceRoot(path);
    const keys = await cacheKeys();
    await Promise.all(
      keys.filter((key) => String(key).includes(root)).map((key) => cacheDelete(key))
    );
  } catch {}
}

export async function flushQueue(): Promise<{
  flushed: number;
  failed: number;
  remaining: number;
}> {
  const base = getApiBaseUrl();
  if (flushing || !base || !online) {
    return { flushed: 0, failed: 0, remaining: await queueCount().catch(() => 0) };
  }

  flushing = true;
  let flushed = 0;
  let failed = 0;
  const idMap = new Map<string, string>();

  try {
    const items = await queueAll();
    for (const item of items) {
      let path = item.path;
      idMap.forEach((serverId, localId) => {
        path = path.split(localId).join(serverId);
      });

      try {
        const response = await fetch(`${base}${path}`, {
          method: item.method,
          headers: item.body ? { "Content-Type": "application/json" } : undefined,
          body: item.body ?? undefined,
          credentials: "include",
        });

        if (response.ok) {
          if (item.localId) {
            try {
              const created = await response.clone().json();
              if (created?.id) idMap.set(item.localId, String(created.id));
            } catch {}
          }
          await queueDelete(item.id);
          await invalidateResource(path);
          flushed += 1;
        } else if (response.status >= 400 && response.status < 500) {
          const text = await response.text().catch(() => "");
          await failedAdd({ ...item, error: `HTTP ${response.status} ${text.slice(0, 200)}` });
          await queueDelete(item.id);
          failed += 1;
        } else {
          break;
        }
      } catch {
        setOnline(false);
        break;
      }
    }

    await metaSet("lastSyncedAt", Date.now());
  } catch {
  } finally {
    flushing = false;
    notifySync();
  }

  return { flushed, failed, remaining: await queueCount().catch(() => 0) };
}

export async function getSyncSummary(): Promise<SyncSummary> {
  const [pending, failed, lastSyncedAt] = await Promise.all([
    queueCount().catch(() => 0),
    failedCount().catch(() => 0),
    metaGet<number>("lastSyncedAt").catch(() => undefined),
  ]);
  return { online, pending, failed, lastSyncedAt: lastSyncedAt ?? null };
}

export function startSyncEngine(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  online = navigator.onLine;

  window.addEventListener("online", () => {
    setOnline(true);
    flushQueue();
  });
  window.addEventListener("offline", () => setOnline(false));

  if (isNativePlatform()) {
    Network.getStatus()
      .then((status) => {
        setOnline(status.connected);
        if (status.connected) flushQueue();
      })
      .catch(() => {});

    Network.addListener("networkStatusChange", (status) => {
      setOnline(status.connected);
      if (status.connected) flushQueue();
    }).catch(() => {});
  }
}
