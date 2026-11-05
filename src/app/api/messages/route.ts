import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const messages = await prisma.contactMessage.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(messages);
  } catch {
    return NextResponse.json({ error: "Failed to fetch inquiries" }, { status: 500 });
  }
}
