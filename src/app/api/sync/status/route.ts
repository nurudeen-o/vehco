import { NextResponse } from "next/server";
import { getSyncStatus } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getSyncStatus();
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ error: "Failed to read sync status" }, { status: 500 });
  }
}
