import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [expenses, maintenanceRecords, vehicles] = await Promise.all([
    prisma.expense.findMany({ include: { vehicle: true } }),
    prisma.maintenanceRecord.findMany({ include: { vehicle: true } }),
    prisma.vehicle.findMany({ where: { deletedAt: null } }),
  ]);

  return (
    <>
      <Header title="Analytics Dashboard" />
      <AnalyticsDashboard
        expenses={expenses}
        maintenanceRecords={maintenanceRecords}
        vehicles={vehicles}
      />
    </>
  );
}
