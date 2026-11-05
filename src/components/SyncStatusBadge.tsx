"use client";

import { useEffect, useState, useCallback } from "react";
import { Cloud, CloudOff, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import { Network } from "@capacitor/network";

const isNative = Capacitor.isNativePlatform();

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  conflictCount: number;
  lastError: string | null;
}

export function SyncStatusBadge() {
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
    if (isNative || triggering || state.isSyncing) return;
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
    if (isNative) {
      let listener: PluginListenerHandle | undefined;
      Network.getStatus()
        .then((status) => {
          setState((prev) => ({ ...prev, isOnline: status.connected }));
        })
        .catch(() => {});
      Network.addListener("networkStatusChange", (status) => {
        setState((prev) => ({ ...prev, isOnline: status.connected }));
      })
        .then((handle) => {
          listener = handle;
        })
        .catch(() => {});
      return () => {
        listener?.remove();
      };
    }

    fetchStatus();
    triggerSync();

    const interval = setInterval(() => {
      fetchStatus();
    }, 15000);

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
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [fetchStatus]);

  const isBusy = state.isSyncing || triggering;

  return (
    <div className="flex items-center gap-2">
      {/* Network & sync badge */}
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
            ? "Device is offline. All changes are saved locally to SQLite."
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
            <span>{isNative ? "Online" : "Cloud Synced"}</span>
          </>
        )}
      </div>

      {/* Manual Sync Button */}
      {!isNative && (
        <button
          onClick={triggerSync}
          disabled={isBusy}
          className="p-1 text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-100 disabled:opacity-50 transition-colors"
          title="Sync with Turso and Cloudinary"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? "animate-spin text-blue-600" : ""}`} />
        </button>
      )}

      {/* Conflict review alert if any */}
      {!isNative && state.conflictCount > 0 && (
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
