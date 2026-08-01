import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions-server";

export async function GET() {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "VIEW_DRIVERS");
    if (!gate.ok) return gate.response;

    const drivers = await prisma.driver.findMany({
      include: { assignedVehicles: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(drivers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch drivers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "REGISTER_DRIVER");
    if (!gate.ok) return gate.response;

    const body = await req.json();
    const driver = await prisma.driver.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        licenseNumber: body.licenseNumber,
        licenseExpiry: new Date(body.licenseExpiry),
        employmentStatus: body.employmentStatus || "ACTIVE",
        emergencyContact: body.emergencyContact || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: gate.session.id,
        action: "CREATE_DRIVER",
        entity: "Driver",
        entityId: driver.id,
        details: `Registered driver ${driver.firstName} ${driver.lastName} by ${gate.session.name}`,
      },
    });

    return NextResponse.json(driver, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create driver" }, { status: 500 });
  }
}
