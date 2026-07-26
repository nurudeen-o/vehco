import { Header } from "@/components/layout/Header";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Car, Plus, QrCode, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  const vehicles = await prisma.vehicle.findMany({
    where: { deletedAt: null },
    include: {
      assignedDriver: true,
      branch: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Header title="Vehicle Management" />
      <div className="page-pad">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Fleet Vehicles</h3>
            <p className="text-xs text-slate-500">Manage vehicle records, driver assignments, and QR code badges.</p>
          </div>
          <Link href="/vehicles/new">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4" /> Register Vehicle
            </Button>
          </Link>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Name / Make</th>
                  <th className="py-3 px-4">Registration</th>
                  <th className="py-3 px-4">Assigned Driver</th>
                  <th className="py-3 px-4">Fuel Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                      No vehicles found. Click &quot;Register Vehicle&quot; to add one.
                    </td>
                  </tr>
                ) : (
                  vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{v.code}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{v.name}</div>
                        <div className="text-xs text-slate-500">{v.manufacturer} {v.model} ({v.year})</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">{v.registrationNumber}</td>
                      <td className="py-3 px-4 text-slate-700">
                        {v.assignedDriver ? (
                          <span className="font-medium text-slate-800">
                            {v.assignedDriver.firstName} {v.assignedDriver.lastName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs font-medium">{v.fuelType}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            v.status === "ACTIVE"
                              ? "success"
                              : v.status === "MAINTENANCE"
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {v.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/vehicles/${v.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" /> View
                            </Button>
                          </Link>
                          <Link href={`/vehicles/${v.id}/qr`}>
                            <Button variant="outline" size="sm">
                              <QrCode className="w-4 h-4" /> QR Card
                            </Button>
                          </Link>
                        </div>
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
