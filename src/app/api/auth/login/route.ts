import { NextResponse } from "next/server";
import { validateCredentials, createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectivePermissions } from "@/lib/permissions-server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const result = await validateCredentials(email, password);
    if (!result.ok) {
      if (result.reason === "suspended") {
        return NextResponse.json(
          {
            error:
              "Your account has been suspended. Contact the Superadmin (CEO).",
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const session = await createSession(email);
    if (!session) {
      return NextResponse.json(
        { error: "User account not found in database" },
        { status: 404 }
      );
    }

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "USER_LOGIN",
        entity: "User",
        entityId: session.id,
        details: `${session.name} (${session.role}) signed in`,
      },
    });

    const permissions = await getEffectivePermissions(session.id);

    return NextResponse.json({ user: session, permissions });
  } catch {
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
