import { NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidRole, requirePermission } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "MANAGE_USERS");
    if (!gate.ok) return gate.response;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        suspendedAt: true,
        suspendedReason: true,
        branchId: true,
        branch: { select: { id: true, name: true, code: true } },
        createdAt: true,
        updatedAt: true,
        _count: { select: { permissionOverrides: true } },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        suspendedAt: u.suspendedAt,
        suspendedReason: u.suspendedReason,
        branchId: u.branchId,
        branch: u.branch,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        overrideCount: u._count.permissionOverrides,
      }))
    );
  } catch {
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "MANAGE_USERS");
    if (!gate.ok) return gate.response;

    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = String(body.role || "SECRETARY").toUpperCase();
    const branchId = body.branchId || null;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }
    if (!isValidRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role,
        status: "ACTIVE",
        branchId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        branchId: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: gate.session.id,
        action: "CREATE_USER",
        entity: "User",
        entityId: user.id,
        details: `${gate.session.name} created user ${user.name} (${user.email}) as ${user.role}`,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
