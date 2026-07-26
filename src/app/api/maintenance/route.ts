import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const records = await prisma.maintenanceRecord.findMany({
      include: { vehicle: true, parts: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch maintenance records" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const record = await prisma.maintenanceRecord.create({
      data: {
        vehicleId: body.vehicleId,
        serviceType: body.serviceType,
        labourCost: parseFloat(body.labourCost) || 0,
        partsCost: parseFloat(body.partsCost) || 0,
        totalCost: parseFloat(body.totalCost),
        vendor: body.vendor || null,
        nextServiceDate: body.nextServiceDate ? new Date(body.nextServiceDate) : null,
        status: "PENDING",
      },
    });

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    await prisma.approval.create({
      data: {
        entityType: "MAINTENANCE",
        entityId: record.id,
        requestedById: session?.id || (await prisma.user.findFirst({ where: { role: "SECRETARY" } }))?.id || "",
        status: "PENDING",
        comments: `Maintenance request for ${record.serviceType}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session?.id || null,
        action: "RECORD_MAINTENANCE",
        entity: "MaintenanceRecord",
        entityId: record.id,
        details: `Requested maintenance for vehicle ${body.vehicleId}: ${record.serviceType} by ${session?.name || "System"}`,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create maintenance record" }, { status: 500 });
  }
}
