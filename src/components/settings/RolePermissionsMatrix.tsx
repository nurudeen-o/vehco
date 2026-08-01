"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  PERMISSION_LABELS,
  PERMISSION_GROUPS,
  getRoleLabel,
  type PermissionKey,
} from "@/lib/permissions";
import { Check, X, Loader2, ShieldAlert, Save, RotateCcw, Plus, Trash2 } from "lucide-react";

type MatrixCell = { allowed: boolean; locked: boolean };
type Matrix = Record<string, Record<PermissionKey, MatrixCell>>;

type RoleItem = { name: string; label: string; isSystem: boolean; userCount: number };

type MatrixResponse = {
  roles: string[];
  roleLabels: Record<string, string>;
  permissions: PermissionKey[];
  labels: Record<PermissionKey, string>;
  groups: { label: string; permissions: PermissionKey[] }[];
  matrix: Matrix;
  canEdit: boolean;
};

export function RolePermissionsMatrix() {
  const [data, setData] = useState<MatrixResponse | null>(null);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", label: "", cloneFrom: "" });
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles");
      if (!res.ok) throw new Error("Failed to load roles");
      const json: RoleItem[] = await res.json();
      setRoles(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles");
    }
  };

  useEffect(() => {
    fetchMatrix();
    fetchRoles();
  }, []);

  const toggleCell = (role: string, permission: PermissionKey) => {
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
    const next: Matrix = {};
    for (const role of data.roles) {
      next[role] = {} as Record<PermissionKey, MatrixCell>;
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
      const updates: { role: string; permission: PermissionKey; allowed: boolean }[] = [];
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

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create role");
      setShowCreate(false);
      setCreateForm({ name: "", label: "", cloneFrom: "" });
      await Promise.all([fetchMatrix(), fetchRoles()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create role");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRole = async (name: string) => {
    if (!confirm(`Delete role ${getRoleLabel(name)}? This cannot be undone.`)) return;
    setError("");
    setDeleting(name);
    try {
      const res = await fetch(`/api/roles?name=${encodeURIComponent(name)}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete role");
      await Promise.all([fetchMatrix(), fetchRoles()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete role");
    } finally {
      setDeleting(null);
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

  const getLabel = (role: string) => data.roleLabels[role] || getRoleLabel(role);

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

      {data.canEdit && (
        <Card>
          <CardHeader
            title="Roles"
            subtitle="Create custom roles and manage their permission matrix."
            action={
              <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" /> Create Role
              </Button>
            }
          />

          {showCreate && (
            <form onSubmit={handleCreateRole} className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-slate-800">Create custom role</h4>
                <button type="button" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  required
                  type="text"
                  placeholder="Role key (e.g. DISPATCHER)"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6B4B]"
                />
                <input
                  required
                  type="text"
                  placeholder="Display label (e.g. Dispatcher)"
                  value={createForm.label}
                  onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6B4B]"
                />
                <select
                  value={createForm.cloneFrom}
                  onChange={(e) => setCreateForm({ ...createForm, cloneFrom: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6B4B]"
                >
                  <option value="">Empty matrix</option>
                  {roles.map((r) => (
                    <option key={r.name} value={r.name}>
                      Copy from {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={creating}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Create
                </Button>
              </div>
            </form>
          )}

          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <div
                key={role.name}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <span className="font-semibold text-slate-700">{role.label}</span>
                <span className="text-slate-400 font-mono">{role.name}</span>
                {role.isSystem ? (
                  <Badge variant="neutral" className="text-[10px]">System</Badge>
                ) : (
                  <>
                    <Badge variant={role.userCount > 0 ? "warning" : "neutral"} className="text-[10px]">
                      {role.userCount} user{role.userCount === 1 ? "" : "s"}
                    </Badge>
                    <button
                      onClick={() => handleDeleteRole(role.name)}
                      disabled={role.userCount > 0 || deleting === role.name}
                      className="text-slate-400 hover:text-rose-600 disabled:opacity-40 disabled:hover:text-slate-400"
                      title={role.userCount > 0 ? "Role is assigned to users" : "Delete role"}
                    >
                      {deleting === role.name ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Role Permissions Matrix"
          subtitle="Toggle which features each role can access. Locked Superadmin cells cannot be changed."
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
                    {getLabel(role)}
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
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-400" title="Locked for Superadmin">
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
