import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const session = await getSession();
    const gate = await requirePermission(session, "REGISTER_VEHICLE");
    if (!gate.ok) return gate.response;

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

    await prisma.auditLog.create({
      data: {
        userId: gate.session.id,
        action: "CREATE_VEHICLE",
        entity: "Vehicle",
        entityId: vehicle.id,
        details: `Registered new vehicle ${vehicle.code} (${vehicle.name}) by ${gate.session.name}`,
      },
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create vehicle" }, { status: 500 });
  }
}
