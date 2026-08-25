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
    const gate = await requirePermission(session, "VIEW_DRIVERS");
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: { assignedVehicles: true },
    });
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }
    return NextResponse.json(driver);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch driver" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "EDIT_DRIVER");
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.driver.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const driver = await prisma.driver.update({
      where: { id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        licenseNumber: body.licenseNumber,
        licenseExpiry: body.licenseExpiry ? new Date(body.licenseExpiry) : undefined,
        employmentStatus: body.employmentStatus,
        emergencyContact: body.emergencyContact || null,
      },
      include: { assignedVehicles: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: gate.session.id,
        action: "UPDATE_DRIVER",
        entity: "Driver",
        entityId: driver.id,
        details: `Updated driver ${driver.firstName} ${driver.lastName} by ${gate.session.name}`,
      },
    });

    return NextResponse.json(driver);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update driver" }, { status: 500 });
  }
}
