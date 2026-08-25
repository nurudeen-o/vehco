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
    const gate = await requirePermission(session, "VIEW_MAINTENANCE_RECORDS");
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const record = await prisma.maintenanceRecord.findUnique({
      where: { id },
      include: { vehicle: true, parts: true, approvedBy: true },
    });
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch maintenance record" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "EDIT_MAINTENANCE");
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.maintenanceRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const data: Record<string, any> = {};

    if (body.vehicleId !== undefined) data.vehicleId = body.vehicleId;
    if (body.serviceType !== undefined) data.serviceType = body.serviceType;
    if (body.labourCost !== undefined) data.labourCost = parseFloat(body.labourCost) || 0;
    if (body.partsCost !== undefined) data.partsCost = parseFloat(body.partsCost) || 0;
    if (body.totalCost !== undefined) data.totalCost = parseFloat(body.totalCost) || 0;
    if (body.vendor !== undefined) data.vendor = body.vendor || null;
    if (body.status !== undefined) data.status = body.status;
    if (body.nextServiceDate !== undefined) data.nextServiceDate = body.nextServiceDate ? new Date(body.nextServiceDate) : null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const record = await prisma.maintenanceRecord.update({
      where: { id },
      data,
      include: { vehicle: true, parts: true },
    });

    const changedFields = Object.keys(data).join(", ");
    await prisma.auditLog.create({
      data: {
        userId: gate.session.id,
        action: "UPDATE_MAINTENANCE",
        entity: "MaintenanceRecord",
        entityId: record.id,
        details: `Updated maintenance record for ${record.serviceType} fields [${changedFields}] by ${gate.session.name}`,
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update maintenance record" }, { status: 500 });
  }
}
