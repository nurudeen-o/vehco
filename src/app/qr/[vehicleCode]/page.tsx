import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CheckCircle2, ShieldCheck, XCircle, AlertCircle, Car, User, Fuel, Phone, Mail, Award } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vehicleCode: string }>;
}): Promise<Metadata> {
  const { vehicleCode } = await params;
  return {
    title: `${vehicleCode} | vehiCO Fleet Verification`,
    description: "Official vehicle identification powered by vehiCO Enterprise Fleet Systems.",
  };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
    ACTIVE: {
      label: "Active & Operational",
      classes: "bg-emerald-100 text-emerald-800 border-emerald-200",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    MAINTENANCE: {
      label: "Under Maintenance",
      classes: "bg-amber-100 text-amber-800 border-amber-200",
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    },
    INACTIVE: {
      label: "Inactive",
      classes: "bg-slate-100 text-slate-600 border-slate-200",
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
    ARCHIVED: {
      label: "Archived",
      classes: "bg-slate-100 text-slate-500 border-slate-200",
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
  };
  const cfg = map[status] ?? map["INACTIVE"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.classes}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-slate-100 last:border-b-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 w-32 shrink-0">
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-800 text-right">{value}</span>
    </div>
  );
}

export default async function PublicQRPage({
  params,
}: {
  params: Promise<{ vehicleCode: string }>;
}) {
  const { vehicleCode } = await params;

  const vehicle = await prisma.vehicle.findUnique({
    where: { code: vehicleCode },
    include: {
      assignedDriver: true,
      branch: true,
    },
  });

  if (!vehicle || vehicle.deletedAt) {
    notFound();
  }

  const driver = vehicle.assignedDriver;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-start py-10 px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#0F6B4B] flex items-center justify-center font-bold text-white text-sm">
              vC
            </div>
            <span className="font-bold text-lg text-slate-900">
              vehi<span className="text-[#F4B400]">CO</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
            Official Fleet Verification
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-[#0F6B4B] px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[11px] text-emerald-200 font-medium uppercase tracking-wide">
                  Verified Vehicle
                </p>
                <p className="font-bold text-white text-base font-mono">{vehicle.code}</p>
              </div>
            </div>
            <StatusBadge status={vehicle.status} />
          </div>

          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Car className="w-4 h-4 text-[#0F6B4B]" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Vehicle Details
              </span>
            </div>
            <div>
              <Field label="Name" value={vehicle.name} />
              <Field
                label="Registration"
                value={<span className="font-mono">{vehicle.registrationNumber}</span>}
              />
              <Field
                label="Make & Model"
                value={`${vehicle.manufacturer} ${vehicle.model}`}
              />
              <Field label="Year" value={vehicle.year} />
              <Field label="Colour" value={vehicle.colour ?? "N/A"} />
              <Field label="Fuel Type" value={vehicle.fuelType} />
              {vehicle.branch && (
                <Field label="Branch" value={vehicle.branch.name} />
              )}
            </div>
          </div>
        </div>

        {driver ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-[#0F6B4B]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Assigned Driver
                </span>
              </div>

              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-[#0F6B4B] text-white flex items-center justify-center font-bold text-sm">
                  {driver.firstName[0]}{driver.lastName[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-900">
                    {driver.firstName} {driver.lastName}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">Lic: {driver.licenseNumber}</p>
                </div>
              </div>

              <div>
                <Field
                  label="Phone"
                  value={
                    <a href={`tel:${driver.phone}`} className="text-[#0F6B4B] hover:underline">
                      {driver.phone}
                    </a>
                  }
                />
                <Field
                  label="Email"
                  value={
                    <a href={`mailto:${driver.email}`} className="text-[#0F6B4B] hover:underline truncate">
                      {driver.email}
                    </a>
                  }
                />
                <Field
                  label="Lic. Expiry"
                  value={formatDate(driver.licenseExpiry)}
                />
                <Field label="Status" value={driver.employmentStatus} />
                {driver.emergencyContact && (
                  <Field label="Emergency" value={driver.emergencyContact} />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-3">
            <User className="w-5 h-5 text-slate-300" />
            <p className="text-sm text-slate-400 italic">No driver currently assigned (Company Pool)</p>
          </div>
        )}

        <div className="text-center space-y-1 pt-2">
          <p className="text-[11px] text-slate-400">
            For full operational data, log in with employee credentials.
          </p>
          <p className="text-[10px] text-slate-300">
            Powered by vehiCO Enterprise Fleet Systems · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
