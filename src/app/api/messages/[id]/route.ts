import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    if (!body?.status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const updated = await prisma.contactMessage.update({
      where: { id },
      data: { status: String(body.status) },
    });

    await prisma.auditLog
      .create({
        data: {
          userId: session.id,
          action: "UPDATE_INQUIRY",
          entity: "ContactMessage",
          entityId: id,
          details: `${session.name} marked inquiry as ${body.status}`,
        },
      })
      .catch(() => {});

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update inquiry" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.contactMessage.update({
      where: { id },
      data: { deletedAt: new Date(), syncStatus: "PENDING", synced: false },
    });

    await prisma.auditLog
      .create({
        data: {
          userId: session.id,
          action: "DELETE_INQUIRY",
          entity: "ContactMessage",
          entityId: id,
          details: `${session.name} deleted an inquiry`,
        },
      })
      .catch(() => {});

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete inquiry" }, { status: 500 });
  }
}
