import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const fuelLogs = await prisma.fuelRecord.findMany({
      include: { vehicle: true, driver: true },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(fuelLogs);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch fuel logs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fuelRecord = await prisma.fuelRecord.create({
      data: {
        vehicleId: body.vehicleId,
        driverId: body.driverId || null,
        litres: parseFloat(body.litres),
        pricePerLitre: parseFloat(body.pricePerLitre),
        totalCost: parseFloat(body.totalCost),
        odometer: parseFloat(body.odometer),
        vendor: body.vendor || null,
        date: new Date(body.date),
      },
    });

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    await prisma.auditLog.create({
      data: {
        userId: session?.id || null,
        action: "RECORD_FUEL",
        entity: "FuelRecord",
        entityId: fuelRecord.id,
        details: `Logged refuel of ${fuelRecord.litres}L (₦${fuelRecord.totalCost.toLocaleString()}) by ${session?.name || "System"}`,
      },
    });

    return NextResponse.json(fuelRecord, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create fuel log" }, { status: 500 });
  }
}
