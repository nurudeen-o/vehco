"use client";

import { useEffect, useState, use } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowLeft, Edit, Wrench, DollarSign, Calendar } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [record, setRecord] = useState<any>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const sRes = await fetch("/api/auth/session");
        if (sRes.ok) {
          const sData = await sRes.json();
          setSessionUser(sData.user);
        }

        const mRes = await fetch(`/api/maintenance/${id}`);
        if (mRes.ok) {
          setRecord(await mRes.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  if (loading) {
    return (
      <>
        <Header title="Maintenance Details" />
        <div className="page-pad">
          <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
          <Card className="space-y-4">
            <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
          </Card>
        </div>
      </>
    );
  }

  if (!record) {
    return (
      <>
        <Header title="Record Not Found" />
        <div className="p-6 text-center text-slate-500">
          Maintenance record not found.
        </div>
      </>
    );
  }

  const canEdit = sessionUser?.role === "CEO" || sessionUser?.role === "MANAGER";

  return (
    <>
      <Header title="Maintenance Record" />
      <div className="page-pad">
        <div className="flex items-center justify-between mb-6">
          <Link href="/maintenance">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" /> Back to Maintenance
            </Button>
          </Link>
          {canEdit && (
            <Link href={`/maintenance/${id}/edit`}>
              <Button variant="primary" size="sm">
                <Edit className="w-4 h-4" /> Edit Record
              </Button>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader
              title={record.serviceType}
              subtitle={`Vehicle: ${record.vehicle?.name} (${record.vehicle?.code})`}
              action={
                <Badge variant={record.status === "APPROVED" ? "success" : record.status === "REJECTED" ? "danger" : "warning"}>
                  {record.status}
                </Badge>
              }
            />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm py-2">
              <div className="flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                <div>
                  <span className="text-xs text-slate-500 block">Service Type</span>
                  <span className="font-semibold text-slate-800">{record.serviceType}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Vendor</span>
                <span className="font-semibold text-slate-800">{record.vendor || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <div>
                  <span className="text-xs text-slate-500 block">Created</span>
                  <span className="font-semibold text-slate-800">{formatDate(record.createdAt)}</span>
                </div>
              </div>
              {record.nextServiceDate && (
                <div>
                  <span className="text-xs text-slate-500 block">Next Service Due</span>
                  <span className="font-semibold text-slate-800">{formatDate(record.nextServiceDate)}</span>
                </div>
              )}
            </div>

            {record.parts && record.parts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">
                  Replaced Parts
                </span>
                <div className="space-y-2">
                  {record.parts.map((part: any) => (
                    <div key={part.id} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{part.partName}</p>
                        {part.partNumber && (
                          <p className="text-xs text-slate-500 font-mono">Part #: {part.partNumber}</p>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-bold text-slate-900">{formatCurrency(part.totalCost)}</p>
                        <p className="text-xs text-slate-500">Qty: {part.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {record.approvedBy && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500 block">Approved by</span>
                <span className="font-semibold text-slate-800 text-sm">{record.approvedBy.name}</span>
              </div>
            )}
          </Card>

          <Card className="bg-[#0F6B4B] text-white">
            <h3 className="text-xs font-semibold uppercase tracking-wider opacity-80">Cost Breakdown</h3>
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-xs opacity-80">Total Cost</p>
                <p className="text-3xl font-bold">{formatCurrency(record.totalCost)}</p>
              </div>
              <div className="border-t border-emerald-700/50 pt-4 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 opacity-90"><Wrench className="w-3.5 h-3.5" /> Labour</span>
                  <span className="font-semibold">{formatCurrency(record.labourCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 opacity-90"><DollarSign className="w-3.5 h-3.5" /> Parts</span>
                  <span className="font-semibold">{formatCurrency(record.partsCost)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
