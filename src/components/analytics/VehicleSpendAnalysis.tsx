"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChart3, X, Loader2 } from "lucide-react";

const COLORS = ["#0F6B4B", "#1E8E5A", "#F4B400", "#0EA5E9", "#8B5CF6", "#F43F5E", "#10B981", "#64748B"];

type VehicleSpend = {
  id: string;
  code: string;
  name: string;
  maintenance: number;
  other: number;
  total: number;
};

type SpendSummary = {
  total: number;
  count: number;
  average: number;
  highest: VehicleSpend | null;
  lowest: VehicleSpend | null;
};

interface VehicleSpendAnalysisProps {
  currentVehicleId?: string;
  buttonLabel?: string;
  buttonVariant?: "primary" | "secondary" | "outline" | "ghost";
}

export function VehicleSpendAnalysis({
  currentVehicleId,
  buttonLabel = "Vehicle Spend Analysis",
  buttonVariant = "outline",
}: VehicleSpendAnalysisProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<VehicleSpend[]>([]);
  const [summary, setSummary] = useState<SpendSummary | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    fetch("/api/analytics/vehicle-spend")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load vehicle spend data");
        return res.json();
      })
      .then((result) => {
        if (cancelled) return;
        setData(result.vehicles || []);
        setSummary(result.summary || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const currentVehicle = useMemo(
    () => data.find((v) => v.id === currentVehicleId) || null,
    [data, currentVehicleId]
  );

  return (
    <>
      <Button variant={buttonVariant} size="sm" onClick={() => setOpen(true)}>
        <BarChart3 className="w-4 h-4" /> {buttonLabel}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Total Amount Spent Per Vehicle</h3>
                <p className="text-xs text-slate-500">Lifetime maintenance and operating expenses</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-5">
              {loading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-[#0F6B4B] animate-spin" />
                  <p className="text-sm text-slate-500">Loading spend analysis...</p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
                  {error}
                </div>
              )}

              {!loading && !error && summary && (
                <>
                  {currentVehicle && (
                    <Card className="bg-sky-50 border-sky-200">
                      <CardHeader title={`Current Vehicle: ${currentVehicle.code}`} subtitle={currentVehicle.name} />
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-[10px] uppercase text-slate-500 font-semibold">Maintenance</p>
                          <p className="font-bold text-slate-900">{formatCurrency(currentVehicle.maintenance)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-slate-500 font-semibold">Other Expenses</p>
                          <p className="font-bold text-slate-900">{formatCurrency(currentVehicle.other)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-slate-500 font-semibold">Total</p>
                          <p className="font-bold text-slate-900">{formatCurrency(currentVehicle.total)}</p>
                        </div>
                      </div>
                    </Card>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Fleet Spend</p>
                      <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(summary.total)}</p>
                    </Card>
                    <Card>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Vehicles with Spend</p>
                      <p className="text-xl font-bold text-slate-900 mt-1">{summary.count}</p>
                    </Card>
                    <Card>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Average per Vehicle</p>
                      <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(summary.average)}</p>
                    </Card>
                    <Card>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Highest Spend</p>
                      <p className="text-xl font-bold text-slate-900 mt-1 truncate">
                        {summary.highest ? `${summary.highest.code}` : "N/A"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {summary.highest ? formatCurrency(summary.highest.total) : "—"}
                      </p>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader title="Spend per Vehicle" subtitle="Stacked bar by cost type" />
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="code" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                          <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={(value: number, name: string) => [formatCurrency(value), name]}
                            labelFormatter={(label) => `Vehicle: ${label}`}
                          />
                          <Bar dataKey="maintenance" name="Maintenance" stackId="a" fill={COLORS[0]}>
                            {data.map((entry) => (
                              <Cell
                                key={`cell-maint-${entry.id}`}
                                fill={entry.id === currentVehicleId ? COLORS[3] : COLORS[0]}
                              />
                            ))}
                          </Bar>
                          <Bar dataKey="other" name="Other Expenses" stackId="a" fill={COLORS[2]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card>
                    <CardHeader title="Vehicle Spend Summary" />
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                          <tr>
                            <th className="py-2.5 px-3">Vehicle</th>
                            <th className="py-2.5 px-3">Maintenance</th>
                            <th className="py-2.5 px-3">Other Expenses</th>
                            <th className="py-2.5 px-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                                No spending data available.
                              </td>
                            </tr>
                          ) : (
                            data.map((v) => (
                              <tr
                                key={v.id}
                                className={
                                  v.id === currentVehicleId
                                    ? "bg-sky-50 font-semibold"
                                    : "hover:bg-slate-50"
                                }
                              >
                                <td className="py-2.5 px-3">
                                  <span className="font-semibold text-slate-800">{v.code}</span>
                                  <span className="block text-[10px] text-slate-500">{v.name}</span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">{formatCurrency(v.maintenance)}</td>
                                <td className="py-2.5 px-3 text-slate-600">{formatCurrency(v.other)}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(v.total)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
