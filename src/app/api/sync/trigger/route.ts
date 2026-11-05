import { NextResponse } from "next/server";
import { runFullSync, getSyncStatus } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await runFullSync();
    const status = await getSyncStatus();
    return NextResponse.json({ result, status });
  } catch {
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
