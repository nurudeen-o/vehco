import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const records = await prisma.maintenanceRecord.findMany({
    include: {
      vehicle: true,
      parts: true,
      approvedBy: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Header title="Maintenance & Repairs" />
      <div className="page-pad">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Servicing & Maintenance Logs</h3>
            <p className="text-xs text-slate-500">Track service types, labour cost, replaced parts, and approval statuses.</p>
          </div>
          <Link href="/maintenance/new">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4" /> Request Maintenance
            </Button>
          </Link>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                <tr>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Service Details</th>
                  <th className="py-3 px-4">Labour Cost</th>
                  <th className="py-3 px-4">Parts Cost</th>
                  <th className="py-3 px-4">Total Cost</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-sm">
                      No maintenance records found.
                    </td>
                  </tr>
                ) : (
                  records.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 cursor-pointer">
                      <td className="py-3 px-4">
                        <Link href={`/maintenance/view?id=${m.id}`} className="font-semibold text-slate-800 hover:text-[#0F6B4B]">
                          {m.vehicle.name} <span className="font-mono text-xs text-slate-500">({m.vehicle.code})</span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div>{m.serviceType}</div>
                        {m.parts.length > 0 && (
                          <div className="text-xs text-slate-500 font-mono">
                            Parts: {m.parts.map((p) => p.partName).join(", ")}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{formatCurrency(m.labourCost)}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{formatCurrency(m.partsCost)}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{formatCurrency(m.totalCost)}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{m.vendor || "N/A"}</td>
                      <td className="py-3 px-4">
                        <Badge variant={m.status === "APPROVED" ? "success" : m.status === "REJECTED" ? "danger" : "warning"}>
                          {m.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{formatDate(m.createdAt)}</td>
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
