import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({
        vehicles: [],
        drivers: [],
        expenses: [],
        maintenance: [],
      });
    }

    const [vehicles, drivers, expenses, maintenance] = await Promise.all([
      prisma.vehicle.findMany({
        where: {
          deletedAt: null,
          OR: [
            { code: { contains: q } },
            { name: { contains: q } },
            { registrationNumber: { contains: q } },
            { vin: { contains: q } },
            { manufacturer: { contains: q } },
            { model: { contains: q } },
          ],
        },
        take: 5,
        select: {
          id: true,
          code: true,
          name: true,
          registrationNumber: true,
          status: true,
        },
      }),
      prisma.driver.findMany({
        where: {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { phone: { contains: q } },
            { licenseNumber: { contains: q } },
            { email: { contains: q } },
          ],
        },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          licenseNumber: true,
        },
      }),
      prisma.expense.findMany({
        where: {
          OR: [
            { description: { contains: q } },
            { category: { contains: q } },
          ],
        },
        take: 5,
        select: {
          id: true,
          category: true,
          amount: true,
          description: true,
          date: true,
        },
      }),
      prisma.maintenanceRecord.findMany({
        where: {
          OR: [
            { serviceType: { contains: q } },
            { vendor: { contains: q } },
          ],
        },
        take: 5,
        select: {
          id: true,
          serviceType: true,
          totalCost: true,
          vendor: true,
          status: true,
        },
      }),
    ]);

    return NextResponse.json({
      vehicles,
      drivers,
      expenses,
      maintenance,
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Failed to perform search" }, { status: 500 });
  }
}
