"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

interface ConflictRecord {
  id: string;
  entity: string;
  entityId: string;
  localData: string;
  remoteData: string;
  resolved: boolean;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchConflicts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sync/conflicts");
      if (res.ok) {
        const data = await res.json();
        setConflicts(data);
      }
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, []);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sync Conflicts Log</h1>
            <p className="text-sm text-slate-500">
              Automatic Last-Write-Wins conflict resolution audit for offline edits
            </p>
          </div>
        </div>
        <button
          onClick={fetchConflicts}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading conflict records...</div>
      ) : conflicts.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-800">Zero Conflicts Detected</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            All offline mutations and remote cloud changes have synced seamlessly without timestamp collisions.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {conflicts.map((c) => {
            const isExpanded = expandedId === c.id;
            let localObj = {};
            let remoteObj = {};
            try { localObj = JSON.parse(c.localData); } catch {}
            try { remoteObj = JSON.parse(c.remoteData); } catch {}

            return (
              <div
                key={c.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{c.entity}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          ID: {c.entityId}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            c.resolution === "REMOTE_WON"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {c.resolution === "REMOTE_WON" ? "Remote Won (Newer Timestamp)" : "Local Won (Newer Timestamp)"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Detected: {new Date(c.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button className="text-xs text-[#0F6B4B] font-medium hover:underline">
                    {isExpanded ? "Hide diff" : "Inspect payload diff"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                        Local Snapshot
                      </h4>
                      <pre className="p-3 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 overflow-x-auto max-h-60">
                        {JSON.stringify(localObj, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                        Remote Snapshot (Turso)
                      </h4>
                      <pre className="p-3 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 overflow-x-auto max-h-60">
                        {JSON.stringify(remoteObj, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
