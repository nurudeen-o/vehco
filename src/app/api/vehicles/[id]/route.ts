import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        assignedDriver: true,
        branch: true,
        fuelRecords: { orderBy: { date: "desc" } },
        maintenanceRecords: { orderBy: { createdAt: "desc" } },
        expenses: { orderBy: { date: "desc" } },
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
    const { assignedDriverId } = body;

    const oldVehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { assignedDriver: true },
    });

    if (!oldVehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        assignedDriverId: assignedDriverId || null,
      },
      include: { assignedDriver: true },
    });

    let details = "";
    if (assignedDriverId) {
      details = `Driver ${vehicle.assignedDriver?.firstName} ${vehicle.assignedDriver?.lastName} assigned to vehicle ${vehicle.code} by ${gate.session.name}`;
    } else {
      details = `Driver ${oldVehicle.assignedDriver ? `${oldVehicle.assignedDriver.firstName} ${oldVehicle.assignedDriver.lastName}` : "unassigned"} removed from vehicle ${vehicle.code} by ${gate.session.name}`;
    }

    await prisma.auditLog.create({
      data: {
        userId: gate.session.id,
        action: "UPDATE_VEHICLE_ASSIGNMENT",
        entity: "Vehicle",
        entityId: vehicle.id,
        details,
      },
    });

    return NextResponse.json(vehicle);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update vehicle assignment" }, { status: 500 });
  }
}
