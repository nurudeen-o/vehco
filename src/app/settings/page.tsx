"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UsersManagement } from "@/components/settings/UsersManagement";
import { RolePermissionsMatrix } from "@/components/settings/RolePermissionsMatrix";
import { Check, ShieldAlert, Settings2, Users, ShieldCheck } from "lucide-react";
import type { PermissionKey } from "@/lib/permissions";

type SessionData = {
  authenticated: boolean;
  user: { id: string; name: string; email: string; role: string; status: string };
  permissions: PermissionKey[];
};

const TABS = [
  { id: "workflow", label: "Workflow", icon: Settings2, permission: "CONFIGURE_WORKFLOW" as PermissionKey },
  { id: "users", label: "Users & Access", icon: Users, permission: "MANAGE_USERS" as PermissionKey },
  { id: "roles", label: "Role Permissions", icon: ShieldCheck, permission: "MANAGE_ROLE_PERMISSIONS" as PermissionKey },
];

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("workflow");

  const [approvalWorkflow, setApprovalWorkflow] = useState("MANAGER_ONLY");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SessionData | null) => {
        if (!data?.authenticated) {
          router.replace("/login");
          return;
        }
        setSession(data);
        setLoading(false);

        // Load current settings
        fetch("/api/settings")
          .then((r) => (r.ok ? r.json() : null))
          .then((cfg) => {
            if (cfg?.approvalWorkflow) setApprovalWorkflow(cfg.approvalWorkflow);
            if (typeof cfg?.emailNotifications === "boolean") {
              setEmailNotifications(cfg.emailNotifications);
            }
          })
          .catch(() => {});
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  const handleSaveWorkflow = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalWorkflow, emailNotifications }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save settings");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const hasPermission = (permission: PermissionKey) =>
    !!session?.permissions?.includes(permission);

  const visibleTabs = TABS.filter((t) => hasPermission(t.permission));

  // Default to first visible tab if current tab is not permitted
  useEffect(() => {
    if (!loading && visibleTabs.length > 0 && !visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [loading, visibleTabs, activeTab]);

  if (loading) {
    return (
      <>
        <Header title="System Settings" />
        <div className="page-pad max-w-6xl mx-auto">
          <p className="text-sm text-slate-500">Checking access...</p>
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Header title="System Settings" />
        <div className="page-pad max-w-lg mx-auto">
          <Card className="text-center space-y-3">
            <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="font-bold text-slate-900">Access restricted</h3>
            <p className="text-xs text-slate-500">Please sign in to access settings.</p>
          </Card>
        </div>
      </>
    );
  }

  if (visibleTabs.length === 0) {
    return (
      <>
        <Header title="System Settings" />
        <div className="page-pad max-w-lg mx-auto">
          <Card className="text-center space-y-3">
            <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="font-bold text-slate-900">Access restricted</h3>
            <p className="text-xs text-slate-500">
              You do not have permission to view any settings sections.
            </p>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="System Settings & Workflow Configuration" />
      <div className="page-pad max-w-6xl mx-auto space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900">System Administration</h3>
          <p className="text-xs text-slate-500">
            Configure approval engines, user access, role permissions, and enterprise parameters.
          </p>
        </div>

        <div className="border-b border-slate-200">
          <nav className="flex gap-1" aria-label="Settings tabs">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? "border-[#0F6B4B] text-[#0F6B4B]"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {activeTab === "workflow" && (
          <div className="space-y-5">
            {saved && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> Settings updated successfully!
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <Card>
              <CardHeader
                title="Approval Engine Configuration"
                subtitle="Define the hierarchy required for maintenance and expense sign-offs"
              />
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    id="mgr"
                    name="workflow"
                    checked={approvalWorkflow === "MANAGER_ONLY"}
                    onChange={() => setApprovalWorkflow("MANAGER_ONLY")}
                    className="mt-1"
                  />
                  <label htmlFor="mgr" className="cursor-pointer">
                    <span className="font-bold text-slate-800 block">Single Tier (Manager Approval)</span>
                    <span className="text-xs text-slate-500">
                      Secretary submits → Manager reviews &amp; approves.
                    </span>
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    id="ceo"
                    name="workflow"
                    checked={approvalWorkflow === "MANAGER_AND_CEO"}
                    onChange={() => setApprovalWorkflow("MANAGER_AND_CEO")}
                    className="mt-1"
                  />
                  <label htmlFor="ceo" className="cursor-pointer">
                    <span className="font-bold text-slate-800 block">Two Tier (Manager + CEO Approval)</span>
                    <span className="text-xs text-slate-500">
                      Secretary submits → Manager endorses → CEO final approval.
                    </span>
                  </label>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Notifications & Alerts" subtitle="Configure automated alert triggers" />
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-slate-800 block">
                      Email Alerts for Pending Approvals
                    </span>
                    <span className="text-xs text-slate-500">
                      Notify managers when a new maintenance request is submitted.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="w-4 h-4 text-[#0F6B4B] rounded border-slate-300 focus:ring-[#0F6B4B]"
                  />
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button variant="primary" onClick={handleSaveWorkflow} disabled={saving}>
                {saving ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </div>
        )}

        {activeTab === "users" && <UsersManagement currentUserId={session.user.id} />}
        {activeTab === "roles" && <RolePermissionsMatrix />}
      </div>
    </>
  );
}
