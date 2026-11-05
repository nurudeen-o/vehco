"use client";
import { useRecordId } from "@/lib/useRecordId";

import { useEffect, useState, use } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowLeft, Edit, Phone, Mail, Award, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function DriverDetailPage() {
  const id = useRecordId();
  const [driver, setDriver] = useState<any>(null);
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

        const dRes = await fetch(`/api/drivers/${id}`);
        if (dRes.ok) {
          setDriver(await dRes.json());
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
        <Header title="Driver Details" />
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

  if (!driver) {
    return (
      <>
        <Header title="Driver Not Found" />
        <div className="p-6 text-center text-slate-500">
          Driver record not found.
        </div>
      </>
    );
  }

  const canEdit = sessionUser?.role === "CEO" || sessionUser?.role === "MANAGER";

  return (
    <>
      <Header title={`Driver - ${driver.firstName} ${driver.lastName}`} />
      <div className="page-pad">
        <div className="flex items-center justify-between mb-6">
          <Link href="/drivers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" /> Back to Drivers
            </Button>
          </Link>
          {canEdit && (
            <Link href={`/drivers/view?id=${id}/edit`}>
              <Button variant="primary" size="sm">
                <Edit className="w-4 h-4" /> Edit Driver
              </Button>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader
              title={`${driver.firstName} ${driver.lastName}`}
              subtitle={`License: ${driver.licenseNumber}`}
              action={
                <Badge variant={driver.employmentStatus === "ACTIVE" ? "success" : "neutral"}>
                  {driver.employmentStatus}
                </Badge>
              }
            />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm py-2">
              <div>
                <span className="text-xs text-slate-500 block">First Name</span>
                <span className="font-semibold text-slate-800">{driver.firstName}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Last Name</span>
                <span className="font-semibold text-slate-800">{driver.lastName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <div>
                  <span className="text-xs text-slate-500 block">Email</span>
                  <span className="font-semibold text-slate-800">{driver.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <div>
                  <span className="text-xs text-slate-500 block">Phone</span>
                  <span className="font-semibold text-slate-800">{driver.phone}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-slate-400" />
                <div>
                  <span className="text-xs text-slate-500 block">License Number</span>
                  <span className="font-mono font-semibold text-slate-800">{driver.licenseNumber}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <div>
                  <span className="text-xs text-slate-500 block">License Expiry</span>
                  <span className="font-semibold text-slate-800">{formatDate(driver.licenseExpiry)}</span>
                </div>
              </div>
            </div>

            {driver.emergencyContact && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500 block">Emergency Contact</span>
                <span className="font-semibold text-slate-800 text-sm">{driver.emergencyContact}</span>
              </div>
            )}
          </Card>

          <Card className="bg-[#0F6B4B] text-white">
            <h3 className="text-xs font-semibold uppercase tracking-wider opacity-80">Assigned Vehicle</h3>
            <div className="mt-3">
              {driver.assignedVehicles && driver.assignedVehicles.length > 0 ? (
                driver.assignedVehicles.map((v: any) => (
                  <Link key={v.id} href={`/vehicles/view?id=${v.id}`} className="block mt-2 p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                    <p className="font-bold text-lg">{v.code}</p>
                    <p className="text-xs opacity-90">{v.name} ({v.registrationNumber})</p>
                  </Link>
                ))
              ) : (
                <p className="text-sm opacity-80 mt-2">No vehicle currently assigned</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
