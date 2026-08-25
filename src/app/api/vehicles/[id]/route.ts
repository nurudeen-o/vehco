import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions-server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "VIEW_VEHICLES");
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        assignedDriver: true,
        branch: true,
        maintenanceRecords: { orderBy: { createdAt: "desc" } },
        expenses: { orderBy: { date: "desc" } },
        images: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    return NextResponse.json(vehicle);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch vehicle" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "EDIT_VEHICLE");
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const data: Record<string, any> = {};

    if (body.code !== undefined) data.code = body.code;
    if (body.name !== undefined) data.name = body.name;
    if (body.registrationNumber !== undefined) data.registrationNumber = body.registrationNumber;
    if (body.vin !== undefined) data.vin = body.vin || null;
    if (body.engineNumber !== undefined) data.engineNumber = body.engineNumber || null;
    if (body.manufacturer !== undefined) data.manufacturer = body.manufacturer;
    if (body.model !== undefined) data.model = body.model;
    if (body.year !== undefined) data.year = parseInt(body.year) || existing.year;
    if (body.colour !== undefined) data.colour = body.colour || null;
    if (body.fuelType !== undefined) data.fuelType = body.fuelType;
    if (body.status !== undefined) data.status = body.status;
    if (body.assignedDriverId !== undefined) data.assignedDriverId = body.assignedDriverId || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data,
      include: { assignedDriver: true, branch: true },
    });

    const changedFields = Object.keys(data).join(", ");
    await prisma.auditLog.create({
      data: {
        userId: gate.session.id,
        action: "UPDATE_VEHICLE",
        entity: "Vehicle",
        entityId: vehicle.id,
        details: `Updated vehicle ${vehicle.code} fields [${changedFields}] by ${gate.session.name}`,
      },
    });

    return NextResponse.json(vehicle);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update vehicle" }, { status: 500 });
  }
}
