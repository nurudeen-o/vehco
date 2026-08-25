"use client";

import { useEffect, useState, use } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { QrCode, ArrowLeft, Wrench, DollarSign, UserMinus, UserCheck, Camera, Trash2, Star, Edit } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { VehicleSpendAnalysis } from "@/components/analytics/VehicleSpendAnalysis";

export default function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [vehicle, setVehicle] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");

  // Image states
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");

  const fetchData = async () => {
    try {
      const vRes = await fetch(`/api/vehicles/${id}`);
      if (vRes.ok) {
        const vData = await vRes.json();
        setVehicle(vData);
        if (vData.assignedDriverId) {
          setSelectedDriverId(vData.assignedDriverId);
        } else {
          setSelectedDriverId("");
        }
      }

      const dRes = await fetch("/api/drivers");
      if (dRes.ok) {
        setDrivers(await dRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const sRes = await fetch("/api/auth/session");
        if (sRes.ok) {
          const sData = await sRes.json();
          setSessionUser(sData.user);
        }
        await fetchData();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  const handleUpdateDriver = async (driverId: string | null) => {
    setAssigning(true);
    try {
      const res = await fetch(`/api/vehicles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedDriverId: driverId }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAssigning(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        uploadForm.append("caption", caption || file.name);
        uploadForm.append(
          "isPrimary",
          (i === 0 && (!vehicle?.images || vehicle.images.length === 0)).toString()
        );

        await fetch(`/api/vehicles/${id}/images`, {
          method: "POST",
          body: uploadForm,
        });
      }
      setCaption("");
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("Remove this image?")) return;
    try {
      await fetch(`/api/vehicles/${id}/images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      // Set all non-primary first, then set this one
      for (const img of vehicle?.images || []) {
        if (img.isPrimary !== (img.id === imageId)) {
          await fetch(`/api/vehicles/${id}/images`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageId: img.id, isPrimary: img.id === imageId }),
          });
        }
      }
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Vehicle Details" />
        <div className="page-pad">
          <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 space-y-4">
              <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                <div className="h-10 bg-slate-100 rounded animate-pulse" />
                <div className="h-10 bg-slate-100 rounded animate-pulse" />
                <div className="h-10 bg-slate-100 rounded animate-pulse" />
              </div>
            </Card>
            <Card className="bg-slate-200 animate-pulse h-40"><div /></Card>
          </div>
        </div>
      </>
    );
  }

  if (!vehicle) {
    return (
      <>
        <Header title="Vehicle Not Found" />
        <div className="p-6 text-center text-slate-500">
          Vehicle record not found.
        </div>
      </>
    );
  }

  const totalMaintCost = vehicle.maintenanceRecords?.reduce((acc: number, curr: any) => acc + curr.totalCost, 0) || 0;
  const totalExpenseCost = vehicle.expenses?.reduce((acc: number, curr: any) => acc + curr.amount, 0) || 0;
  const lifetimeCost = totalMaintCost + totalExpenseCost;

  const canEdit = sessionUser?.role === "CEO" || sessionUser?.role === "MANAGER";

  const primaryImage = vehicle.images?.find((img: any) => img.isPrimary) || vehicle.images?.[0];

  return (
    <>
      <Header title={`Vehicle Details - ${vehicle.code}`} />
      <div className="page-pad">
        <div className="flex items-center justify-between">
          <Link href="/vehicles">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" /> Back to Vehicles
            </Button>
          </Link>
          <div className="flex gap-2">
            <VehicleSpendAnalysis currentVehicleId={vehicle.id} buttonLabel="Vehicle Spend" />
            {canEdit && (
              <Link href={`/vehicles/${vehicle.id}/edit`}>
                <Button variant="primary" size="sm">
                  <Edit className="w-4 h-4" /> Edit Vehicle
                </Button>
              </Link>
            )}
            <Link href={`/vehicles/${vehicle.id}/qr`}>
              <Button variant="outline" size="sm">
                <QrCode className="w-4 h-4" /> QR Card & Identification
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader
              title={vehicle.name}
              subtitle={`Registration: ${vehicle.registrationNumber} | Code: ${vehicle.code}`}
              action={
                <Badge
                  variant={
                    vehicle.status === "ACTIVE"
                      ? "success"
                      : vehicle.status === "MAINTENANCE"
                      ? "warning"
                      : "neutral"
                  }
                >
                  {vehicle.status}
                </Badge>
              }
            />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm py-2">
              <div>
                <span className="text-xs text-slate-500 block">Manufacturer</span>
                <span className="font-semibold text-slate-800">{vehicle.manufacturer}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Model</span>
                <span className="font-semibold text-slate-800">{vehicle.model}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Manufacture Year</span>
                <span className="font-semibold text-slate-800">{vehicle.year}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">VIN (Chassis)</span>
                <span className="font-mono text-xs font-semibold text-slate-800">{vehicle.vin || "N/A"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Engine Number</span>
                <span className="font-mono text-xs font-semibold text-slate-800">{vehicle.engineNumber || "N/A"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Fuel Type</span>
                <span className="font-semibold text-slate-800">{vehicle.fuelType}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Colour</span>
                <span className="font-semibold text-slate-800">{vehicle.colour || "N/A"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Assigned Driver</span>
                <span className="font-semibold text-slate-800">
                  {vehicle.assignedDriver
                    ? `${vehicle.assignedDriver.firstName} ${vehicle.assignedDriver.lastName}`
                    : "Unassigned"}
                </span>
              </div>
            </div>

            {canEdit && (
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Driver Assignment Panel
                </span>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedDriverId}
                    disabled={assigning}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0F6B4B] w-64"
                  >
                    <option value="">-- No Assigned Driver (Pool) --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.firstName} {d.lastName} ({d.licenseNumber})
                      </option>
                    ))}
                  </select>

                  {selectedDriverId !== vehicle.assignedDriverId ? (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={assigning}
                      onClick={() => handleUpdateDriver(selectedDriverId || null)}
                    >
                      {assigning ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" /> Apply Driver
                        </>
                      )}
                    </Button>
                  ) : vehicle.assignedDriverId ? (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={assigning}
                      onClick={() => handleUpdateDriver(null)}
                    >
                      {assigning ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <UserMinus className="w-4 h-4" /> Remove Driver
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </Card>

          <Card className="bg-[#0F6B4B] text-white">
            <h3 className="text-xs font-semibold uppercase tracking-wider opacity-80">Lifetime Operating Cost</h3>
            <h2 className="text-3xl font-bold mt-1">{formatCurrency(lifetimeCost)}</h2>

            <div className="mt-6 space-y-3 border-t border-emerald-700/50 pt-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 opacity-90"><Wrench className="w-3.5 h-3.5" /> Maintenance</span>
                <span className="font-semibold">{formatCurrency(totalMaintCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 opacity-90"><DollarSign className="w-3.5 h-3.5" /> Other Expenses</span>
                <span className="font-semibold">{formatCurrency(totalExpenseCost)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Vehicle Images Gallery */}
        <Card>
          <CardHeader
            title="Vehicle Images"
            subtitle={`${vehicle.images?.length || 0} photo(s) uploaded`}
          />

          {canEdit && (
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Image Caption (optional)</label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. Front view, Interior..."
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B4B] w-56"
                />
              </div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#0F6B4B] hover:bg-[#0c573d] text-white text-sm font-medium rounded-lg transition-colors">
                <Camera className="w-4 h-4" />
                {uploading ? "Uploading..." : "Add Images"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          )}

          {!vehicle.images || vehicle.images.length === 0 ? (
            <p className="text-slate-400 text-sm">No images uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {vehicle.images.map((img: any) => (
                <div key={img.id} className="relative group rounded-xl overflow-hidden border border-slate-200">
                  <img
                    src={img.url}
                    alt={img.caption || "Vehicle image"}
                    className="w-full h-36 object-cover"
                  />
                  {img.isPrimary && (
                    <span className="absolute top-2 left-2 bg-[#F4B400] text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      PRIMARY
                    </span>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-[11px] font-medium truncate">{img.caption || "Vehicle photo"}</p>
                  </div>
                  {canEdit && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!img.isPrimary && (
                        <button
                          onClick={() => handleSetPrimary(img.id)}
                          className="p-1 bg-[#F4B400] rounded-full hover:bg-yellow-400"
                          title="Set as primary"
                        >
                          <Star className="w-3 h-3 text-slate-900" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        className="p-1 bg-red-500 rounded-full hover:bg-red-600"
                        title="Remove image"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          <Card>
            <CardHeader title="Recent Maintenance Records" />
            <div className="space-y-3 text-xs">
              {!vehicle.maintenanceRecords || vehicle.maintenanceRecords.length === 0 ? (
                <p className="text-slate-400">No maintenance records logged.</p>
              ) : (
                vehicle.maintenanceRecords.map((m: any) => (
                  <div key={m.id} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-800">{m.serviceType}</p>
                      <p className="text-slate-500">{formatDate(m.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{formatCurrency(m.totalCost)}</p>
                      <Badge variant={m.status === "APPROVED" ? "success" : "warning"}>{m.status}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
