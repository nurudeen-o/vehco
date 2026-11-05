import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions-server";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "VIEW_DOCUMENTS");
    if (!gate.ok) return gate.response;

    const { id } = await params;

    await prisma.document.update({
      where: { id },
      data: { deletedAt: new Date(), syncStatus: "PENDING", synced: false },
    });

    await prisma.auditLog
      .create({
        data: {
          userId: gate.session.id,
          action: "DELETE_DOCUMENT",
          entity: "Document",
          entityId: id,
          details: `${gate.session.name} deleted a document`,
        },
      })
      .catch(() => {});

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
