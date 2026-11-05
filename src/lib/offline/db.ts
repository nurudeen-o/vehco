export type QueuedRequest = {
  id: string;
  seq: number;
  method: string;
  path: string;
  body: string | null;
  createdAt: number;
  localId: string | null;
  error: string | null;
};

const DB_NAME = "faco-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("cache")) db.createObjectStore("cache");
        if (!db.objectStoreNames.contains("queue")) {
          db.createObjectStore("queue", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("failed")) {
          db.createObjectStore("failed", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

async function run<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = operation(tx.objectStore(storeName));
    let value: T | undefined;
    request.onsuccess = () => {
      value = request.result as T;
    };
    tx.oncomplete = () => resolve(value as T);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const cacheGet = <T>(key: string) =>
  run<T | undefined>("cache", "readonly", (store) => store.get(key));

export const cachePut = (key: string, value: unknown) =>
  run<void>("cache", "readwrite", (store) => store.put(value, key));

export const cacheKeys = () =>
  run<IDBValidKey[]>("cache", "readonly", (store) => store.getAllKeys());

export const cacheDelete = (key: IDBValidKey) =>
  run<void>("cache", "readwrite", (store) => store.delete(key));

export const queueAdd = (item: QueuedRequest) =>
  run<void>("queue", "readwrite", (store) => store.put(item));

export const queueAll = async () =>
  (await run<QueuedRequest[]>("queue", "readonly", (store) => store.getAll())).sort(
    (a, b) => a.seq - b.seq
  );

export const queueDelete = (id: string) =>
  run<void>("queue", "readwrite", (store) => store.delete(id));

export const queueCount = () => run<number>("queue", "readonly", (store) => store.count());

export const failedAdd = (item: QueuedRequest) =>
  run<void>("failed", "readwrite", (store) => store.put(item));

export const failedAll = () =>
  run<QueuedRequest[]>("failed", "readonly", (store) => store.getAll());

export const failedCount = () => run<number>("failed", "readonly", (store) => store.count());

export const failedClear = () => run<void>("failed", "readwrite", (store) => store.clear());

export const metaGet = <T>(key: string) =>
  run<T | undefined>("meta", "readonly", (store) => store.get(key));

export const metaSet = (key: string, value: unknown) =>
  run<void>("meta", "readwrite", (store) => store.put(value, key));
