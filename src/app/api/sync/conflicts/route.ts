import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const conflicts = await prisma.syncConflict.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(conflicts);
  } catch {
    return NextResponse.json({ error: "Failed to fetch conflicts" }, { status: 500 });
  }
}
