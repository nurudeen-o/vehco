import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [vehicles, maintenanceRecords, expenses] = await Promise.all([
      prisma.vehicle.findMany({ where: { deletedAt: null }, select: { id: true, code: true, name: true } }),
      prisma.maintenanceRecord.findMany({ select: { vehicleId: true, totalCost: true } }),
      prisma.expense.findMany({ select: { vehicleId: true, amount: true, category: true } }),
    ]);

    const data = vehicles
      .map((v) => {
        const maintenance = maintenanceRecords
          .filter((m) => m.vehicleId === v.id)
          .reduce((sum, m) => sum + m.totalCost, 0);
        const other = expenses
          .filter((e) => e.vehicleId === v.id)
          .reduce((sum, e) => sum + e.amount, 0);
        return {
          id: v.id,
          code: v.code,
          name: v.name,
          maintenance,
          other,
          total: maintenance + other,
        };
      })
      .filter((v) => v.total > 0)
      .sort((a, b) => b.total - a.total);

    const categoryTotals: Record<string, number> = {
      Maintenance: maintenanceRecords.reduce((s, m) => s + m.totalCost, 0),
    };
    expenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    return NextResponse.json({
      vehicles: data,
      summary: {
        total: data.reduce((s, v) => s + v.total, 0),
        count: data.length,
        average: data.length > 0 ? data.reduce((s, v) => s + v.total, 0) / data.length : 0,
        highest: data[0] || null,
        lowest: data[data.length - 1] || null,
      },
      categories: Object.entries(categoryTotals).map(([name, value]) => ({ name, value })),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch vehicle spend data" }, { status: 500 });
  }
}
