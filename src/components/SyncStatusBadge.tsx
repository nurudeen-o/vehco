"use client";

import { useCallback, useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { flushQueue, getSyncSummary, subscribeSync } from "@/lib/offline/sync";
import { hasApiBaseUrl } from "@/lib/offline/config";

const isNative = Capacitor.isNativePlatform();

export function SyncStatusBadge() {
  return isNative ? <NativeSyncBadge /> : <WebSyncBadge />;
}

function NativeSyncBadge() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [serverConfigured, setServerConfigured] = useState(true);

  const refresh = useCallback(async () => {
    const summary = await getSyncSummary();
    setOnline(summary.online);
    setPending(summary.pending);
    setFailed(summary.failed);
    setServerConfigured(hasApiBaseUrl());
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeSync(refresh);
    Network.getStatus()
      .then((status) => setOnline(status.connected))
      .catch(() => {});
    const listenerPromise = Network.addListener("networkStatusChange", (status) => {
      setOnline(status.connected);
    });
    return () => {
      unsubscribe();
      listenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, [refresh]);

  const syncNow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await flushQueue();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const label = !serverConfigured
    ? "Set server"
    : busy
    ? "Syncing..."
    : !online
    ? `Offline${pending > 0 ? ` (${pending})` : ""}`
    : pending > 0
    ? `${pending} pending`
    : "Online";

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
          !serverConfigured
            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
            : !online
            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
            : busy
            ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
            : pending > 0
            ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
        }`}
        title={
          !serverConfigured
            ? "No sync server configured for this build."
            : !online
            ? "You are offline. Changes are stored on this device and sync when you reconnect."
            : pending > 0
            ? `${pending} change(s) waiting to sync`
            : "All local changes are synced"
        }
      >
        {!serverConfigured ? (
          <>
            <CloudOff className="w-3.5 h-3.5" />
            <span>{label}</span>
          </>
        ) : !online ? (
          <>
            <CloudOff className="w-3.5 h-3.5" />
            <span>{label}</span>
          </>
        ) : busy ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>{label}</span>
          </>
        ) : pending > 0 ? (
          <>
            <Cloud className="w-3.5 h-3.5" />
            <span>{label}</span>
          </>
        ) : (
          <>
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{label}</span>
          </>
        )}
      </div>

      <button
        onClick={syncNow}
        data-tour="header-sync-btn"
        disabled={busy || !online || !serverConfigured}
        className="p-1 text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-100 disabled:opacity-50 transition-colors"
        title="Sync now"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin text-blue-600" : ""}`} />
      </button>

      {failed > 0 && (
        <span
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20"
          title={`${failed} change(s) were rejected by the server and need attention`}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>{failed} failed</span>
        </span>
      )}
    </div>
  );
}

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  conflictCount: number;
  lastError: string | null;
}

function WebSyncBadge() {
  const [state, setState] = useState<SyncState>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,
    conflictCount: 0,
    lastError: null,
  });
  const [triggering, setTriggering] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/sync/status");
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch {
      setState((prev) => ({ ...prev, isOnline: false }));
    }
  }, []);

  const triggerSync = async () => {
    if (triggering || state.isSyncing) return;
    setTriggering(true);
    try {
      const res = await fetch("/api/sync/trigger", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.status) setState(data.status);
      }
    } catch {
      setState((prev) => ({ ...prev, isOnline: false }));
    } finally {
      setTriggering(false);
      fetchStatus();
    }
  };

  useEffect(() => {
    fetchStatus();
    triggerSync();

    const interval = setInterval(() => {
      fetchStatus();
    }, 15000);

    const autoSync = setInterval(() => {
      if (!navigator.onLine) return;
      fetch("/api/sync/trigger", { method: "POST" }).catch(() => {});
    }, 300000);

    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
      triggerSync();
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      clearInterval(autoSync);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [fetchStatus]);

  const isBusy = state.isSyncing || triggering;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
          !state.isOnline
            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
            : isBusy
            ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
            : state.pendingCount > 0
            ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
        }`}
        title={
          !state.isOnline
            ? "Device is offline."
            : state.lastSyncedAt
            ? `Last synced: ${new Date(state.lastSyncedAt).toLocaleTimeString()}`
            : "Online & Synced"
        }
      >
        {!state.isOnline ? (
          <>
            <CloudOff className="w-3.5 h-3.5" />
            <span>Offline {state.pendingCount > 0 && `(${state.pendingCount} local)`}</span>
          </>
        ) : isBusy ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Syncing...</span>
          </>
        ) : state.pendingCount > 0 ? (
          <>
            <Cloud className="w-3.5 h-3.5" />
            <span>{state.pendingCount} pending push</span>
          </>
        ) : (
          <>
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Cloud Synced</span>
          </>
        )}
      </div>

      <button
        onClick={triggerSync}
        disabled={isBusy}
        className="p-1 text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-100 disabled:opacity-50 transition-colors"
        title="Sync with Turso and Cloudinary"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? "animate-spin text-blue-600" : ""}`} />
      </button>

      {state.conflictCount > 0 && (
        <Link
          href="/settings/conflicts"
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20 transition-colors"
          title={`${state.conflictCount} sync conflicts resolved`}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>{state.conflictCount} conflicts</span>
        </Link>
      )}
    </div>
  );
}
