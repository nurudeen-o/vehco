import { Header } from "@/components/layout/Header";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Car, Wrench, CheckSquare, Clock } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AuditDownload } from "@/components/dashboard/AuditDownload";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    totalVehicles,
    activeVehicles,
    maintenanceVehicles,
    totalDrivers,
    pendingApprovals,
    maintenanceRecords,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.vehicle.count({ where: { deletedAt: null } }),
    prisma.vehicle.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.vehicle.count({ where: { status: "MAINTENANCE", deletedAt: null } }),
    prisma.driver.count(),
    prisma.approval.count({ where: { status: "PENDING" } }),
    prisma.maintenanceRecord.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { vehicle: true } }),
    prisma.auditLog.findMany({ take: 6, orderBy: { createdAt: "desc" }, include: { user: true } }),
  ]);

  const monthlyMaintCost = maintenanceRecords.reduce((acc, curr) => acc + curr.totalCost, 0);

  return (
    <>
      <Header title="Dashboard & KPI Analytics" />
      <div className="page-pad">
        <div data-tour="dashboard-kpis" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fleet Size</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalVehicles}</h3>
                <p className="text-xs text-emerald-600 font-medium mt-1">{activeVehicles} Active Vehicles</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-[#0F6B4B]">
                <Car className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Under Maintenance</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{maintenanceVehicles}</h3>
                <p className="text-xs text-amber-600 font-medium mt-1">Requires Attention</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                <Wrench className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Approvals</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{pendingApprovals}</h3>
                <p className="text-xs text-rose-600 font-medium mt-1">Manager & CEO Queue</p>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
                <CheckSquare className="w-6 h-6" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader
                title="Recent Maintenance Requests"
                subtitle="Pending operational review & approvals"
                action={<Link href="/maintenance" className="text-xs text-[#0F6B4B] font-semibold hover:underline">View All</Link>}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Vehicle</th>
                      <th className="py-2.5 px-3">Service Type</th>
                      <th className="py-2.5 px-3">Cost</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {maintenanceRecords.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400 text-xs">No records available</td>
                      </tr>
                    ) : (
                      maintenanceRecords.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-medium text-slate-800">
                            {m.vehicle?.name} ({m.vehicle?.code})
                          </td>
                          <td className="py-3 px-3 text-slate-600">{m.serviceType}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{formatCurrency(m.totalCost)}</td>
                          <td className="py-3 px-3">
                            <Badge variant={m.status === "APPROVED" ? "success" : m.status === "REJECTED" ? "danger" : "warning"}>
                              {m.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Audit & System Activity"
                subtitle="Real-time audit log stream"
                action={<AuditDownload />}
              />
              <div className="space-y-4">
                {recentAuditLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No audit activity yet</p>
                ) : (
                  recentAuditLogs.map((log) => (
                    <div key={log.id} className="flex gap-3 text-xs">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">
                          {log.user?.name || "System"}{" "}
                          <span className="font-normal text-slate-500">({log.action})</span>
                        </p>
                        <p className="text-slate-600 mt-0.5 break-words">{log.details}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="bg-slate-900 text-white">
              <h4 className="font-semibold text-base mb-2">Faco Vehicle Mgt App Quick Actions</h4>
              <p className="text-xs text-slate-400 mb-4">Common data entry tasks for Secretary & Managers.</p>
              <div className="flex flex-col gap-2">
                <Link href="/vehicles/new" className="px-3 py-2 bg-[#0F6B4B] hover:bg-[#0c573d] text-white text-xs font-medium rounded-lg text-center transition-colors">
                  + Register New Vehicle
                </Link>
                <Link href="/maintenance/new" className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg text-center transition-colors">
                  + Record Maintenance Request
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
