import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions-server";

export async function GET() {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "VIEW_APPROVALS");
    if (!gate.ok) return gate.response;

    const approvals = await prisma.approval.findMany({
      include: {
        requestedBy: true,
        approver: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(approvals);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch approvals" }, { status: 500 });
  }
}
