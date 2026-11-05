import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Plus, User, Phone, Mail, Award } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DriversPage() {
  const drivers = await prisma.driver.findMany({
    include: {
      assignedVehicles: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Header title="Driver Management" />
      <div className="page-pad">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Drivers & Personnel</h3>
            <p className="text-xs text-slate-500">Track driver licenses, contact information, and vehicle assignments.</p>
          </div>
          <Link href="/drivers/new">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4" /> Register Driver
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {drivers.map((driver) => (
            <Link key={driver.id} href={`/drivers/view?id=${driver.id}`}>
              <Card className="space-y-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0F6B4B] text-white flex items-center justify-center font-bold text-sm">
                      {driver.firstName[0]}{driver.lastName[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{driver.firstName} {driver.lastName}</h4>
                      <span className="text-xs text-slate-500 font-mono">Lic: {driver.licenseNumber}</span>
                    </div>
                  </div>
                  <Badge variant={driver.employmentStatus === "ACTIVE" ? "success" : "neutral"}>
                    {driver.employmentStatus}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{driver.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{driver.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-slate-400" />
                    <span>License Expiry: {formatDate(driver.licenseExpiry)}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Assigned Vehicle:</span>
                  <span className="font-semibold text-slate-800">
                    {driver.assignedVehicles.length > 0
                      ? driver.assignedVehicles[0].code
                      : "None"}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
