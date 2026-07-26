import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Plus, Fuel } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FuelPage() {
  const fuelLogs = await prisma.fuelRecord.findMany({
    include: {
      vehicle: true,
      driver: true,
    },
    orderBy: { date: "desc" },
  });

  const totalSpent = fuelLogs.reduce((acc, curr) => acc + curr.totalCost, 0);
  const totalLitres = fuelLogs.reduce((acc, curr) => acc + curr.litres, 0);

  return (
    <>
      <Header title="Fuel Management" />
      <div className="page-pad">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Fuel Expenditure Logs</h3>
            <p className="text-xs text-slate-500">Record fuel fills, monitor volume, vendor receipts, and mileage.</p>
          </div>
          <Link href="/fuel/new">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4" /> Log Fuel Refill
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Fuel Expenditure</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalSpent)}</h3>
              </div>
              <div className="p-3 bg-emerald-50 text-[#0F6B4B] rounded-xl">
                <Fuel className="w-6 h-6" />
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Fuel Dispensed</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalLitres.toFixed(1)} Litres</h3>
              </div>
              <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
                <Fuel className="w-6 h-6" />
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Litres</th>
                  <th className="py-3 px-4">Price/Litre</th>
                  <th className="py-3 px-4">Total Cost</th>
                  <th className="py-3 px-4">Odometer</th>
                  <th className="py-3 px-4">Vendor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fuelLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-sm">
                      No fuel logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  fuelLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-xs font-medium text-slate-600">{formatDate(log.date)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {log.vehicle.name} <span className="font-mono text-xs text-slate-500">({log.vehicle.code})</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {log.driver ? `${log.driver.firstName} ${log.driver.lastName}` : "N/A"}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{log.litres} L</td>
                      <td className="py-3 px-4 text-slate-600 text-xs">{formatCurrency(log.pricePerLitre)}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{formatCurrency(log.totalCost)}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-xs">{log.odometer.toLocaleString()} km</td>
                      <td className="py-3 px-4 text-slate-500 text-xs">{log.vendor || "N/A"}</td>
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
