import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
