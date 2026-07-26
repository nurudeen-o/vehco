import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { deletedAt: null },
      include: { assignedDriver: true, branch: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(vehicles);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch vehicles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const vehicle = await prisma.vehicle.create({
      data: {
        code: body.code,
        name: body.name,
        registrationNumber: body.registrationNumber,
        vin: body.vin || null,
        engineNumber: body.engineNumber || null,
        manufacturer: body.manufacturer,
        model: body.model,
        year: parseInt(body.year) || new Date().getFullYear(),
        colour: body.colour || null,
        fuelType: body.fuelType || "PETROL",
        status: body.status || "ACTIVE",
      },
    });

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    await prisma.auditLog.create({
      data: {
        userId: session?.id || null,
        action: "CREATE_VEHICLE",
        entity: "Vehicle",
        entityId: vehicle.id,
        details: `Registered new vehicle ${vehicle.code} (${vehicle.name}) by ${session?.name || "System"}`,
      },
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create vehicle" }, { status: 500 });
  }
}
