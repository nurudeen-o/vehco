import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "CEO" && session.role !== "MANAGER")) {
      return NextResponse.json({ error: "Access denied. Managers and CEOs only." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, comments } = body;

    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const approval = await prisma.approval.update({
      where: { id },
      data: {
        status,
        comments: comments || null,
        approverId: session.id,
      },
    });

    if (approval.entityType === "MAINTENANCE") {
      await prisma.maintenanceRecord.update({
        where: { id: approval.entityId },
        data: {
          status,
          approvedById: session.id,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: `MAINTENANCE_${status}`,
        entity: approval.entityType,
        entityId: approval.entityId,
        details: `${approval.entityType} request #${approval.entityId.slice(0, 8)} was ${status.toLowerCase()} by ${session.name} (${session.role})`,
      },
    });

    return NextResponse.json(approval);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update approval" }, { status: 500 });
  }
}
