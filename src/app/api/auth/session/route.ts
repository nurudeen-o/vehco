import { NextResponse } from "next/server";
import { getSessionWithPermissions } from "@/lib/auth";

export async function GET() {
  const data = await getSessionWithPermissions();

  if (!data) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: data.user,
    permissions: data.permissions,
  });
}
