import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PERMISSIONS,
  isLockedPermission,
  PERMISSION_GROUPS,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  type PermissionKey,
  defaultAllows,
  buildDefaultRolePermissionRows,
  getRoleLabel,
} from "@/lib/permissions";
import { requirePermission } from "@/lib/permissions-server";

async function ensureRolePermissionsSeeded() {
  const count = await prisma.rolePermission.count();
  if (count > 0) return;
  const rows = buildDefaultRolePermissionRows();
  await prisma.rolePermission.createMany({
    data: rows.map((r) => ({
      role: r.role,
      permission: r.permission,
      allowed: r.allowed,
    })),
  });
}

export async function GET() {
  try {
    const session = await getSession();
    // Managers may view matrix read-only if they have VIEW_SETTINGS; edits need MANAGE_ROLE_PERMISSIONS
    const gate = await requirePermission(session, "VIEW_SETTINGS");
    if (!gate.ok) {
      const adminGate = await requirePermission(session, "MANAGE_ROLE_PERMISSIONS");
      if (!adminGate.ok) return gate.response;
    }

    await ensureRolePermissionsSeeded();

    const roles = await prisma.role.findMany({ orderBy: { createdAt: "asc" } });
    const roleNames = roles.map((r) => r.name);

    const rows = await prisma.rolePermission.findMany();
    const map = new Map(rows.map((r) => [`${r.role}:${r.permission}`, r.allowed]));

    const matrix: Record<
      string,
      Record<PermissionKey, { allowed: boolean; locked: boolean }>
    > = {};

    for (const role of roleNames) {
      matrix[role] = {} as Record<PermissionKey, { allowed: boolean; locked: boolean }>;
      for (const permission of PERMISSION_KEYS) {
        const locked = isLockedPermission(role, permission);
        const key = `${role}:${permission}`;
        const allowed = locked
          ? true
          : map.has(key)
            ? !!map.get(key)
            : defaultAllows(role, permission);
        matrix[role][permission] = { allowed, locked };
      }
    }

    return NextResponse.json({
      roles: roleNames,
      roleLabels: Object.fromEntries(roles.map((r) => [r.name, r.label])),
      permissions: PERMISSION_KEYS,
      labels: PERMISSION_LABELS,
      groups: PERMISSION_GROUPS,
      defaults: DEFAULT_PERMISSIONS,
      matrix,
      canEdit: session
        ? (await requirePermission(session, "MANAGE_ROLE_PERMISSIONS")).ok
        : false,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load role permissions" },
      { status: 500 }
    );
  }
}

/**
 * Body: { updates: [{ role, permission, allowed }] }
 */
export async function PUT(req: Request) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "MANAGE_ROLE_PERMISSIONS");
    if (!gate.ok) return gate.response;

    await ensureRolePermissionsSeeded();

    const body = await req.json();
    const updates = Array.isArray(body.updates) ? body.updates : [];
    if (updates.length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const validRoles = new Set(
      (await prisma.role.findMany({ select: { name: true } })).map((r) => r.name)
    );

    const applied: { role: string; permission: string; allowed: boolean }[] = [];

    for (const item of updates) {
      const role = String(item.role || "").toUpperCase();
      const permission = String(item.permission || "") as PermissionKey;
      if (!validRoles.has(role)) {
        return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 });
      }
      if (!PERMISSION_KEYS.includes(permission)) {
        return NextResponse.json(
          { error: `Unknown permission: ${permission}` },
          { status: 400 }
        );
      }
      if (isLockedPermission(role, permission)) {
        continue;
      }
      const allowed = !!item.allowed;
      await prisma.rolePermission.upsert({
        where: {
          role_permission: { role, permission },
        },
        create: {
          role,
          permission,
          allowed,
          updatedById: gate.session.id,
        },
        update: {
          allowed,
          updatedById: gate.session.id,
        },
      });
      applied.push({ role, permission, allowed });
    }

    if (applied.length > 0) {
      const changedRoles = [...new Set(applied.map((a) => a.role))];
      const roleLabelList = changedRoles.map((r) => getRoleLabel(r)).join(", ");
      await prisma.auditLog.create({
        data: {
          userId: gate.session.id,
          action: "UPDATE_ROLE_PERMISSIONS",
          entity: "RolePermission",
          entityId: "matrix",
          details: `${gate.session.name} updated permissions for ${roleLabelList}`,
        },
      });
    }

    return NextResponse.json({ ok: true, applied: applied.length });
  } catch {
    return NextResponse.json(
      { error: "Failed to update role permissions" },
      { status: 500 }
    );
  }
}
