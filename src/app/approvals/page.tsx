"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Check, X, ShieldAlert } from "lucide-react";
import { getRoleLabel } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchApprovals = async () => {
    try {
      const res = await fetch("/api/approvals");
      if (res.ok) {
        const data = await res.json();
        setApprovals(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setUser(sessionData.user);
        }

        const approvalsRes = await fetch("/api/approvals");
        if (approvalsRes.ok) {
          const data = await approvalsRes.json();
          setApprovals(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleAction = async (id: string, status: "APPROVED" | "REJECTED") => {
    setActionId(id);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchApprovals();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Approval Engine Queue" />
        <div className="page-pad">
          <div className="h-10 w-48 bg-slate-200 rounded-lg animate-pulse" />
          <Card className="space-y-4">
            <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          </Card>
        </div>
      </>
    );
  }

  const hasAccess = user?.role === "CEO" || user?.role === "MANAGER";

  if (!hasAccess) {
    return (
      <>
        <Header title="Approval Engine Queue" />
        <div className="p-6 max-w-lg mx-auto mt-12">
          <Card className="text-center py-10 space-y-4 border-rose-200">
            <div className="w-12 h-12 bg-rose-50 border border-rose-200 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Access Restricted</h3>
              <p className="text-sm text-slate-500 mt-1">
                Only managers and executive administrators are authorized to process operations in the approval queue.
              </p>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Approval Engine Queue" />
      <div className="page-pad">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Pending & Historical Approvals</h3>
          <p className="text-xs text-slate-500">Manager and CEO workflow queue for operational requests.</p>
        </div>

        <Card data-tour="approvals-queue">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                <tr>
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4">Comments</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {approvals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                      No approval requests in queue.
                    </td>
                  </tr>
                ) : (
                  approvals.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900">
                        #{app.id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-[#0F6B4B]">
                        {app.entityType}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {app.requestedBy?.name} ({getRoleLabel(app.requestedBy?.role)})
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {app.comments || "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={app.status === "APPROVED" ? "success" : app.status === "REJECTED" ? "danger" : "warning"}>
                          {app.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{formatDate(app.createdAt)}</td>
                      <td className="py-3 px-4 text-right">
                        {app.status === "PENDING" ? (
                          <div data-tour="approvals-actions" className="flex items-center justify-end gap-2">
                            {actionId === app.id ? (
                              <div className="w-5 h-5 border-2 border-[#0F6B4B] border-t-transparent rounded-full animate-spin mr-6" />
                            ) : (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleAction(app.id, "APPROVED")}
                                >
                                  <Check className="w-3.5 h-3.5" /> Approve
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleAction(app.id, "REJECTED")}
                                >
                                  <X className="w-3.5 h-3.5" /> Reject
                                </Button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
