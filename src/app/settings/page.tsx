"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Check, ShieldAlert } from "lucide-react";
import { hasPermission } from "@/lib/permissions";

export default function SettingsPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [approvalWorkflow, setApprovalWorkflow] = useState("MANAGER_ONLY");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const role = data?.user?.role;
        if (role && hasPermission(role, "VIEW_SETTINGS")) {
          setAllowed(true);
          // Load current settings if API returns them later
          fetch("/api/settings")
            .then((r) => (r.ok ? r.json() : null))
            .then((cfg) => {
              if (cfg?.approvalWorkflow) setApprovalWorkflow(cfg.approvalWorkflow);
              if (typeof cfg?.emailNotifications === "boolean") {
                setEmailNotifications(cfg.emailNotifications);
              }
            })
            .catch(() => {});
        } else {
          setAllowed(false);
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        setAllowed(false);
        router.replace("/login");
      });
  }, [router]);

  const handleSave = async () => {
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

  if (allowed === null) {
    return (
      <>
        <Header title="System Settings" />
        <div className="page-pad max-w-4xl mx-auto">
          <p className="text-sm text-slate-500">Checking access...</p>
        </div>
      </>
    );
  }

  if (!allowed) {
    return (
      <>
        <Header title="System Settings" />
        <div className="page-pad max-w-lg mx-auto">
          <Card className="text-center space-y-3">
            <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="font-bold text-slate-900">Access restricted</h3>
            <p className="text-xs text-slate-500">
              Only CEO and Manager roles can view or update system settings.
            </p>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="System Settings & Workflow Configuration" />
      <div className="page-pad max-w-4xl mx-auto">
        <div>
          <h3 className="text-lg font-bold text-slate-900">System Administration</h3>
          <p className="text-xs text-slate-500">
            Configure approval engines, notification rules, and enterprise parameters. CEO and Manager only.
          </p>
        </div>

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
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>
    </>
  );
}
