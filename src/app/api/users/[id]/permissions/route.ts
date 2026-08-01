import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_KEYS, type PermissionKey } from "@/lib/permissions";
import { requirePermission } from "@/lib/permissions-server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "MANAGE_USERS");
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        permissionOverrides: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      overrides: user.permissionOverrides.map((o) => ({
        permission: o.permission,
        allowed: o.allowed,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load user permissions" },
      { status: 500 }
    );
  }
}

/**
 * Replace per-user feature overrides.
 * Body: { overrides: [{ permission, allowed }] }
 * Empty list clears all overrides (user inherits role matrix fully).
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "MANAGE_USERS");
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (id === gate.session.id) {
      return NextResponse.json(
        { error: "You cannot override your own feature access" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const raw = Array.isArray(body.overrides) ? body.overrides : [];

    const overrides: { permission: PermissionKey; allowed: boolean }[] = [];
    for (const item of raw) {
      const permission = String(item.permission || "") as PermissionKey;
      if (!PERMISSION_KEYS.includes(permission)) {
        return NextResponse.json(
          { error: `Unknown permission: ${permission}` },
          { status: 400 }
        );
      }
      // Never allow stripping locked superadmin perms via override on a CEO
      // (overrides still apply for other features)
      overrides.push({
        permission,
        allowed: !!item.allowed,
      });
    }

    await prisma.$transaction([
      prisma.userPermissionOverride.deleteMany({ where: { userId: id } }),
      ...overrides.map((o) =>
        prisma.userPermissionOverride.create({
          data: {
            userId: id,
            permission: o.permission,
            allowed: o.allowed,
          },
        })
      ),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: gate.session.id,
        action: "UPDATE_USER_PERMISSIONS",
        entity: "User",
        entityId: id,
        details: `${gate.session.name} updated ${user.name} feature access`,
      },
    });

    return NextResponse.json({
      ok: true,
      overrides,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update user permissions" },
      { status: 500 }
    );
  }
}
