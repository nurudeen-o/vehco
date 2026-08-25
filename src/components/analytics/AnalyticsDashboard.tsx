"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#0F6B4B", "#1E8E5A", "#F4B400", "#0EA5E9", "#8B5CF6", "#F43F5E", "#10B981", "#64748B"];

type Expense = {
  id: string;
  vehicleId: string;
  category: string;
  amount: number;
  date: Date | string;
  vehicle?: { code: string; name: string } | null;
};

type MaintenanceRecord = {
  id: string;
  vehicleId: string;
  totalCost: number;
  createdAt: Date | string;
  vehicle?: { code: string; name: string } | null;
};

type Vehicle = {
  id: string;
  code: string;
  name: string;
};

function parseDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function AnalyticsDashboard({
  expenses,
  maintenanceRecords,
  vehicles,
}: {
  expenses: Expense[];
  maintenanceRecords: MaintenanceRecord[];
  vehicles: Vehicle[];
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const lastYear = currentYear - 1;

  // Spend per vehicle (all time)
  const vehicleSpend = vehicles
    .map((v) => {
      const maint = maintenanceRecords
        .filter((m) => m.vehicleId === v.id)
        .reduce((sum, m) => sum + m.totalCost, 0);
      const exp = expenses
        .filter((e) => e.vehicleId === v.id)
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        code: v.code,
        name: v.name,
        maintenance: maint,
        expenses: exp,
        total: maint + exp,
      };
    })
    .filter((v) => v.total > 0)
    .sort((a, b) => b.total - a.total);

  const totalMaintenance = maintenanceRecords.reduce((s, m) => s + m.totalCost, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const grandTotal = totalMaintenance + totalExpenses;

  // Category breakdown
  const categoryTotals: Record<string, number> = {
    Maintenance: totalMaintenance,
  };
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });
  const categoryData = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Monthly trend - last 12 months
  const months: { key: string; label: string; date: Date }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(currentYear, now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: monthLabel(d), date: d });
  }

  const monthlyMap = new Map<string, { maintenance: number; expenses: number }>();
  months.forEach((m) => monthlyMap.set(m.key, { maintenance: 0, expenses: 0 }));

  maintenanceRecords.forEach((m) => {
    const key = monthKey(parseDate(m.createdAt));
    if (monthlyMap.has(key)) monthlyMap.get(key)!.maintenance += m.totalCost;
  });
  expenses.forEach((e) => {
    const key = monthKey(parseDate(e.date));
    if (monthlyMap.has(key)) monthlyMap.get(key)!.expenses += e.amount;
  });

  const monthlyData = months.map((m) => ({
    label: m.label,
    maintenance: monthlyMap.get(m.key)!.maintenance,
    expenses: monthlyMap.get(m.key)!.expenses,
    total:
      monthlyMap.get(m.key)!.maintenance +
      monthlyMap.get(m.key)!.expenses,
  }));

  // YoY - current year vs last year by month
  const yoyMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(currentYear, i, 1);
    return { month: d.toLocaleDateString("en-US", { month: "short" }), monthIndex: i };
  });

  const yoyData = yoyMonths.map(({ month, monthIndex }) => {
    const currentYearKey = `${currentYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    const lastYearKey = `${lastYear}-${String(monthIndex + 1).padStart(2, "0")}`;

    const sum = (key: string) => {
      const maint = maintenanceRecords
        .filter((m) => monthKey(parseDate(m.createdAt)) === key)
        .reduce((s, m) => s + m.totalCost, 0);
      const exp = expenses
        .filter((e) => monthKey(parseDate(e.date)) === key)
        .reduce((s, e) => s + e.amount, 0);
      return maint + exp;
    };

    return {
      month,
      currentYear: sum(currentYearKey),
      lastYear: sum(lastYearKey),
    };
  });

  // MoM
  const momData = monthlyData.map((m) => ({
    label: m.label,
    total: m.total,
  }));

  // DoD - last 30 days
  const days: { key: string; label: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ key: dayKey(d), label: dayLabel(d) });
  }

  const dailyMap = new Map<string, number>();
  days.forEach((d) => dailyMap.set(d.key, 0));

  maintenanceRecords.forEach((m) => {
    const key = dayKey(parseDate(m.createdAt));
    if (dailyMap.has(key)) dailyMap.set(key, dailyMap.get(key)! + m.totalCost);
  });
  expenses.forEach((e) => {
    const key = dayKey(parseDate(e.date));
    if (dailyMap.has(key)) dailyMap.set(key, dailyMap.get(key)! + e.amount);
  });

  const dailyData = days.map((d) => ({
    label: d.label,
    total: dailyMap.get(d.key)!,
  }));

  const tooltipCurrencyFormatter = (value: number) => formatCurrency(value);

  return (
    <div className="page-pad">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Fleet Analytics Dashboard</h3>
          <p className="text-xs text-slate-500">
            Year-over-year, month-over-month, and day-over-day spending insights.
          </p>
        </div>
        <p className="text-xs text-slate-400">As of {formatDate(now)}</p>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Grand Total Spend</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(grandTotal)}</p>
        </Card>
        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Maintenance</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalMaintenance)}</p>
        </Card>
        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Other Expenses</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalExpenses)}</p>
        </Card>
      </div>

      {/* Monthly trend line chart */}
      <Card>
        <CardHeader
          title="Monthly Spend Trend (Last 12 Months)"
          subtitle="Line view of maintenance and operating expenses"
        />
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={tooltipCurrencyFormatter} />
              <Legend />
              <Line type="monotone" dataKey="maintenance" name="Maintenance" stroke={COLORS[0]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expenses" name="Other Expenses" stroke={COLORS[2]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* YoY bar chart */}
        <Card>
          <CardHeader
            title="Year-over-Year Comparison"
            subtitle={`${currentYear} vs ${lastYear} monthly spend`}
          />
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yoyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipCurrencyFormatter} />
                <Legend />
                <Bar dataKey="currentYear" name={String(currentYear)} fill={COLORS[0]} radius={[2, 2, 0, 0]} />
                <Bar dataKey="lastYear" name={String(lastYear)} fill={COLORS[7]} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* MoM bar chart */}
        <Card>
          <CardHeader title="Month-over-Month Total Spend" subtitle="Last 12 months combined spend" />
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={momData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipCurrencyFormatter} />
                <Bar dataKey="total" name="Total Spend" fill={COLORS[1]} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DoD line chart */}
        <Card>
          <CardHeader title="Day-over-Day Spend (Last 30 Days)" subtitle="Daily combined spend trend" />
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipCurrencyFormatter} />
                <Line type="monotone" dataKey="total" name="Daily Spend" stroke={COLORS[3]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Category pie chart */}
        <Card>
          <CardHeader title="Spend by Category" subtitle="Proportional breakdown of all spend types" />
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name}: ₦${(entry.value / 1000).toFixed(0)}k`}
                  labelLine={false}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipCurrencyFormatter} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top vehicles by spend */}
      <Card>
        <CardHeader title="Top Vehicles by Lifetime Spend" subtitle="All-time maintenance and expenses per vehicle" />
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={vehicleSpend.slice(0, 15)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="code" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={tooltipCurrencyFormatter} />
              <Legend />
              <Bar dataKey="maintenance" name="Maintenance" stackId="a" fill={COLORS[0]} />
              <Bar dataKey="expenses" name="Other Expenses" stackId="a" fill={COLORS[2]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
