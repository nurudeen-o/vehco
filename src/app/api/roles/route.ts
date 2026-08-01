import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_KEYS, buildDefaultRolePermissionRows } from "@/lib/permissions";
import { requirePermission } from "@/lib/permissions-server";

function toRoleName(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

export async function GET() {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "MANAGE_ROLE_PERMISSIONS");
    if (!gate.ok) return gate.response;

    const roles = await prisma.role.findMany({ orderBy: { createdAt: "asc" } });
    const userCounts = await prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    });
    const countMap = new Map(
      userCounts.map((u) => [u.role, u._count.role])
    );

    return NextResponse.json(
      roles.map((r) => ({
        name: r.name,
        label: r.label,
        isSystem: r.isSystem,
        userCount: countMap.get(r.name) || 0,
        createdAt: r.createdAt,
      }))
    );
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: "Failed to list roles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "MANAGE_ROLE_PERMISSIONS");
    if (!gate.ok) return gate.response;

    const body = await req.json();
    const name = toRoleName(String(body.name || ""));
    const label = String(body.label || "").trim() || name;
    const cloneFrom = String(body.cloneFrom || "").toUpperCase();

    if (!name) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      );
    }
    if (name.length < 2) {
      return NextResponse.json(
        { error: "Role name must be at least 2 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: "A role with this name already exists" },
        { status: 409 }
      );
    }

    const role = await prisma.role.create({
      data: { name, label, isSystem: false },
    });

    // Seed permission rows: clone from another role, or all denied
    if (cloneFrom) {
      const sourceRows = await prisma.rolePermission.findMany({
        where: { role: cloneFrom },
      });
      if (sourceRows.length > 0) {
        await prisma.rolePermission.createMany({
          data: sourceRows.map((r) => ({
            role: role.name,
            permission: r.permission,
            allowed: r.allowed,
            updatedById: gate.session.id,
          })),
        });
      } else {
        await prisma.rolePermission.createMany({
          data: PERMISSION_KEYS.map((permission) => ({
            role: role.name,
            permission,
            allowed: false,
            updatedById: gate.session.id,
          })),
        });
      }
    } else {
      await prisma.rolePermission.createMany({
        data: PERMISSION_KEYS.map((permission) => ({
          role: role.name,
          permission,
          allowed: false,
          updatedById: gate.session.id,
        })),
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: gate.session.id,
        action: "CREATE_ROLE",
        entity: "Role",
        entityId: role.name,
        details: `${gate.session.name} created role ${role.label} (${role.name})`,
      },
    });

    return NextResponse.json(role, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "MANAGE_ROLE_PERMISSIONS");
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(req.url);
    const name = String(searchParams.get("name") || "").toUpperCase();
    if (!name) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    const role = await prisma.role.findUnique({ where: { name } });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    if (role.isSystem) {
      return NextResponse.json(
        { error: "System roles cannot be deleted" },
        { status: 400 }
      );
    }

    const userCount = await prisma.user.count({ where: { role: name } });
    if (userCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete a role that is assigned to users" },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { role: name } }),
      prisma.role.delete({ where: { name } }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: gate.session.id,
        action: "DELETE_ROLE",
        entity: "Role",
        entityId: name,
        details: `${gate.session.name} deleted role ${role.label}`,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
  }
}
