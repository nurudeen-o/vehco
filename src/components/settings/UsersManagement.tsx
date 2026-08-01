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
import {
  Plus,
  X,
  Check,
  Loader2,
  ShieldAlert,
  UserCog,
  Lock,
  Unlock,
  Save,
  Trash2,
} from "lucide-react";

type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  suspendedAt?: string | null;
  suspendedReason?: string | null;
  overrideCount: number;
};

type UserDetail = UserListItem & {
  permissionOverrides: { permission: PermissionKey; allowed: boolean }[];
};

type RoleItem = { name: string; label: string; isSystem: boolean };

function roleLabel(roles: RoleItem[], roleName: string): string {
  return roles.find((r) => r.name === roleName)?.label || getRoleLabel(roleName);
}

function statusBadge(status: string) {
  if (status === "SUSPENDED") return <Badge variant="danger">Suspended</Badge>;
  return <Badge variant="success">Active</Badge>;
}

export function UsersManagement({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "SECRETARY",
  });
  const [creating, setCreating] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  const [featureUser, setFeatureUser] = useState<UserDetail | null>(null);
  const [featureOpen, setFeatureOpen] = useState(false);
  const [featureOverrides, setFeatureOverrides] = useState<
    Partial<Record<PermissionKey, boolean | null>>
  >({});
  const [savingFeatures, setSavingFeatures] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles");
      if (!res.ok) throw new Error("Failed to load roles");
      const data = await res.json();
      setRoles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles");
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      setShowCreate(false);
      setCreateForm({ name: "", email: "", password: "", role: "SECRETARY" });
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const openEdit = async (user: UserListItem) => {
    setError("");
    const res = await fetch(`/api/users/${user.id}`);
    if (!res.ok) {
      setError("Failed to load user details");
      return;
    }
    const detail: UserDetail = await res.json();
    setSelectedUser(detail);
    setDrawerOpen(true);
  };

  const saveUserChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSavingUser(true);
    setError("");
    try {
      const form = e.currentTarget as HTMLFormElement;
      const formData = new FormData(form);
      const payload: Record<string, unknown> = {
        name: String(formData.get("name") || "").trim(),
        role: String(formData.get("role") || "").toUpperCase(),
        status: String(formData.get("status") || "").toUpperCase(),
        suspendedReason: String(formData.get("suspendedReason") || "").trim() || null,
      };
      const password = String(formData.get("password") || "");
      if (password) payload.password = password;

      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");
      setDrawerOpen(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSavingUser(false);
    }
  };

  const openFeatures = async (user: UserListItem) => {
    setError("");
    const res = await fetch(`/api/users/${user.id}`);
    if (!res.ok) {
      setError("Failed to load user details");
      return;
    }
    const detail: UserDetail = await res.json();
    const map: Partial<Record<PermissionKey, boolean | null>> = {};
    for (const key of Object.keys(PERMISSION_LABELS) as PermissionKey[]) {
      const override = detail.permissionOverrides.find((o) => o.permission === key);
      map[key] = override ? override.allowed : null;
    }
    setFeatureUser(detail);
    setFeatureOverrides(map);
    setFeatureOpen(true);
  };

  const saveFeatures = async () => {
    if (!featureUser) return;
    setSavingFeatures(true);
    setError("");
    try {
      const overrides = Object.entries(featureOverrides)
        .filter(([, v]) => v !== null)
        .map(([permission, allowed]) => ({ permission, allowed: !!allowed }));
      const res = await fetch(`/api/users/${featureUser.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update features");
      setFeatureOpen(false);
      setFeatureUser(null);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update features");
    } finally {
      setSavingFeatures(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      <Card>
        <CardHeader
          title="Staff Users"
          subtitle="Create, suspend, and manage feature access for staff"
          action={
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" /> Add User
            </Button>
          }
        />

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-5 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-slate-800">Create staff user</h4>
              <button type="button" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                required
                type="text"
                placeholder="Full name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6B4B]"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6B4B]"
              />
              <input
                required
                type="password"
                placeholder="Password (min 8 chars)"
                minLength={8}
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6B4B]"
              />
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6B4B]"
              >
                {roles.map((r) => (
                  <option key={r.name} value={r.name}>
                    {r.label}
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

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading users...
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                <tr>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Overrides</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {u.name}
                      {u.id === currentUserId && (
                        <span className="ml-2 text-[10px] text-slate-400">(you)</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-xs">{u.email}</td>
                    <td className="py-3 px-3 text-slate-700 text-xs font-medium">{roleLabel(roles, u.role)}</td>
                    <td className="py-3 px-3">{statusBadge(u.status)}</td>
                    <td className="py-3 px-3 text-xs text-slate-500">
                      {u.overrideCount > 0 ? `${u.overrideCount} set` : "—"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                          <UserCog className="w-3.5 h-3.5" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openFeatures(u)}>
                          <Lock className="w-3.5 h-3.5" /> Features
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit user drawer */}
      {drawerOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <form
            onSubmit={saveUserChanges}
            className="relative w-full max-w-md bg-white h-full shadow-xl p-5 overflow-y-auto space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Edit {selectedUser.name}</h3>
              <button type="button" onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
                <input
                  name="name"
                  defaultValue={selectedUser.name}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6B4B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Role</label>
                <select
                  name="role"
                  defaultValue={selectedUser.role}
                  disabled={selectedUser.id === currentUserId}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6B4B] disabled:bg-slate-100"
                >
                  {roles.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {selectedUser.id === currentUserId && (
                  <p className="text-[10px] text-slate-400 mt-1">You cannot change your own role.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                <select
                  name="status"
                  defaultValue={selectedUser.status}
                  disabled={selectedUser.id === currentUserId}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6B4B] disabled:bg-slate-100"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                {selectedUser.id === currentUserId && (
                  <p className="text-[10px] text-slate-400 mt-1">You cannot suspend your own account.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Suspension reason</label>
                <input
                  name="suspendedReason"
                  defaultValue={selectedUser.suspendedReason || ""}
                  placeholder="Reason shown to user on login"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6B4B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Reset password</label>
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  placeholder="Leave blank to keep current"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6B4B]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setDrawerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={savingUser}>
                {savingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Feature overrides drawer */}
      {featureOpen && featureUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFeatureOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-xl p-5 overflow-y-auto space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Feature Access</h3>
                <p className="text-xs text-slate-500">
                  {featureUser.name} · {roleLabel(roles, featureUser.role)}
                </p>
              </div>
              <button onClick={() => setFeatureOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 flex gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              Toggle Explicit Allow or Deny to override the role default. Set to Inherit to follow the role matrix.
            </div>

            <div className="space-y-5">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.label}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{group.label}</h4>
                  <div className="space-y-2">
                    {group.permissions.map((permission) => {
                      const value = featureOverrides[permission];
                      return (
                        <div
                          key={permission}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                        >
                          <span className="text-sm text-slate-700">{PERMISSION_LABELS[permission]}</span>
                          <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5">
                            <button
                              type="button"
                              onClick={() => setFeatureOverrides({ ...featureOverrides, [permission]: false })}
                              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                                value === false
                                  ? "bg-rose-100 text-rose-700"
                                  : "text-slate-400 hover:bg-slate-100"
                              }`}
                            >
                              Deny
                            </button>
                            <button
                              type="button"
                              onClick={() => setFeatureOverrides({ ...featureOverrides, [permission]: null })}
                              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                                value === null ? "bg-slate-200 text-slate-700" : "text-slate-400 hover:bg-slate-100"
                              }`}
                            >
                              Inherit
                            </button>
                            <button
                              type="button"
                              onClick={() => setFeatureOverrides({ ...featureOverrides, [permission]: true })}
                              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                                value === true
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "text-slate-400 hover:bg-slate-100"
                              }`}
                            >
                              Allow
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setFeatureOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={saveFeatures} disabled={savingFeatures}>
                {savingFeatures ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Overrides
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
