"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewFuelRecordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    vehicleId: "",
    driverId: "",
    litres: 0,
    pricePerLitre: 0,
    totalCost: 0,
    odometer: 0,
    vendor: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetch("/api/vehicles").then((r) => r.json()).then(setVehicles);
    fetch("/api/drivers").then((r) => r.json()).then(setDrivers);
  }, []);

  const handleLitresOrPriceChange = (litres: number, price: number) => {
    const total = litres * price;
    setFormData((prev) => ({
      ...prev,
      litres,
      pricePerLitre: price,
      totalCost: parseFloat(total.toFixed(2)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/fuel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        router.push("/fuel");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Log Fuel Refill" />
      <div className="page-pad max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/fuel">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" /> Back to Fuel Logs
            </Button>
          </Link>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Vehicle</label>
                <select
                  required
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B4B]"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.code} - {v.name} ({v.registrationNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Driver (Optional)</label>
                <select
                  value={formData.driverId}
                  onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B4B]"
                >
                  <option value="">-- Choose Driver --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.firstName} {d.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Volume (Litres)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.litres}
                  onChange={(e) => handleLitresOrPriceChange(parseFloat(e.target.value) || 0, formData.pricePerLitre)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B4B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Price per Litre (₦)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.pricePerLitre}
                  onChange={(e) => handleLitresOrPriceChange(formData.litres, parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B4B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Calculated Total Cost (₦)</label>
                <input
                  type="number"
                  step="0.01"
                  readOnly
                  value={formData.totalCost}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-lg text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Odometer Reading (KM)</label>
                <input
                  type="number"
                  required
                  value={formData.odometer}
                  onChange={(e) => setFormData({ ...formData, odometer: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B4B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Fuel Station / Vendor</label>
                <input
                  type="text"
                  placeholder="e.g. Shell CBD Station"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B4B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B4B]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Link href="/fuel">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "Logging..." : "Save Fuel Entry"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
