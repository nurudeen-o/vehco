import { NextResponse } from "next/server";
import { getSession, destroySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getSession();

    if (session) {
      await prisma.auditLog.create({
        data: {
          userId: session.id,
          action: "USER_LOGOUT",
          entity: "User",
          entityId: session.id,
          details: `${session.name} (${session.role}) signed out`,
        },
      });
    }

    await destroySession();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
