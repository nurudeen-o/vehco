"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  PERMISSION_LABELS,
  PERMISSION_GROUPS,
  ROLE_LABELS,
  type PermissionKey,
  type UserRole,
} from "@/lib/permissions";
import { Check, X, Loader2, ShieldAlert, Save, RotateCcw } from "lucide-react";

type MatrixCell = { allowed: boolean; locked: boolean };
type Matrix = Record<UserRole, Record<PermissionKey, MatrixCell>>;

type MatrixResponse = {
  roles: UserRole[];
  permissions: PermissionKey[];
  labels: Record<PermissionKey, string>;
  groups: { label: string; permissions: PermissionKey[] }[];
  matrix: Matrix;
  canEdit: boolean;
};



export function RolePermissionsMatrix() {
  const [data, setData] = useState<MatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchMatrix = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/roles/permissions");
      if (!res.ok) throw new Error("Failed to load role permissions");
      const json: MatrixResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load role permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  const toggleCell = (role: UserRole, permission: PermissionKey) => {
    if (!data) return;
    const cell = data.matrix[role][permission];
    if (cell.locked) return;
    setData({
      ...data,
      matrix: {
        ...data.matrix,
        [role]: {
          ...data.matrix[role],
          [permission]: { ...cell, allowed: !cell.allowed },
        },
      },
    });
  };

  const resetToDefaults = () => {
    if (!data) return;
    const next: Matrix = { CEO: {}, MANAGER: {}, SECRETARY: {} } as Matrix;
    for (const role of data.roles) {
      for (const permission of data.permissions) {
        const cell = data.matrix[role][permission];
        next[role][permission] = { allowed: cell.locked ? true : false, locked: cell.locked };
      }
    }
    setData({ ...data, matrix: next });
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setError("");
    try {
      const updates: { role: UserRole; permission: PermissionKey; allowed: boolean }[] = [];
      for (const role of data.roles) {
        for (const permission of data.permissions) {
          const cell = data.matrix[role][permission];
          if (cell.locked) continue;
          updates.push({ role, permission, allowed: cell.allowed });
        }
      }
      const res = await fetch("/api/roles/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save permissions");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await fetchMatrix();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading permission matrix...
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <div className="py-12 text-center text-rose-600 text-sm font-semibold flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4" /> {error || "Unable to load matrix"}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}
      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" /> Role permissions saved successfully.
        </div>
      )}

      <Card>
        <CardHeader
          title="Role Permissions Matrix"
          subtitle="Toggle which features each role can access. Locked CEO cells cannot be changed."
          action={
            data.canEdit ? (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={resetToDefaults}>
                  <RotateCcw className="w-3.5 h-3.5" /> Reset all off
                </Button>
                <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Matrix
                </Button>
              </div>
            ) : (
              <Badge variant="info">Read-only</Badge>
            )
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
              <tr>
                <th className="py-3 px-4 min-w-[14rem]">Feature</th>
                {data.roles.map((role) => (
                  <th key={role} className="py-3 px-4 text-center min-w-[7rem]">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PERMISSION_GROUPS.map((group) => (
                <>
                  <tr key={group.label} className="bg-slate-100/60">
                    <td
                      colSpan={data.roles.length + 1}
                      className="py-2 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"
                    >
                      {group.label}
                    </td>
                  </tr>
                  {group.permissions.map((permission) => (
                    <tr key={permission} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {PERMISSION_LABELS[permission]}
                        <span className="block text-[10px] text-slate-400 font-normal font-mono">
                          {permission}
                        </span>
                      </td>
                      {data.roles.map((role) => {
                        const cell = data.matrix[role][permission];
                        return (
                          <td key={role} className="py-3 px-4 text-center">
                            {cell.locked ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-400" title="Locked for CEO">
                                <ShieldAlert className="w-4 h-4" />
                              </span>
                            ) : data.canEdit ? (
                              <button
                                type="button"
                                onClick={() => toggleCell(role, permission)}
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                                  cell.allowed
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                    : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                }`}
                                title={cell.allowed ? "Allowed" : "Denied"}
                              >
                                {cell.allowed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                              </button>
                            ) : (
                              <span
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${
                                  cell.allowed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                }`}
                              >
                                {cell.allowed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
