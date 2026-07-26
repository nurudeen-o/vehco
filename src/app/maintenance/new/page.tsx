"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewMaintenancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    vehicleId: "",
    serviceType: "",
    labourCost: 0,
    partsCost: 0,
    totalCost: 0,
    vendor: "",
    nextServiceDate: "",
  });

  useEffect(() => {
    fetch("/api/vehicles").then((r) => r.json()).then(setVehicles);
  }, []);

  const handleCostsChange = (labour: number, parts: number) => {
    const total = labour + parts;
    setFormData((prev) => ({
      ...prev,
      labourCost: labour,
      partsCost: parts,
      totalCost: parseFloat(total.toFixed(2)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        router.push("/maintenance");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Record Maintenance Request" />
      <div className="page-pad max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/maintenance">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" /> Back to Maintenance Logs
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
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Service / Repair Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brake Pad Replacement & Oil Change"
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B4B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Labour Cost (₦)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.labourCost}
                  onChange={(e) => handleCostsChange(parseFloat(e.target.value) || 0, formData.partsCost)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B4B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Parts Cost (₦)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.partsCost}
                  onChange={(e) => handleCostsChange(formData.labourCost, parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B4B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Total Estimated Cost (₦)</label>
                <input
                  type="number"
                  step="0.01"
                  readOnly
                  value={formData.totalCost}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-lg text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Garage / Vendor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Bosch Service Station"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B4B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Next Service Due Date</label>
                <input
                  type="date"
                  value={formData.nextServiceDate}
                  onChange={(e) => setFormData({ ...formData, nextServiceDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F6B4B]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Link href="/maintenance">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "Submitting..." : "Submit Maintenance Request"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
