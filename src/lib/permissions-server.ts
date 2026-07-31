import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import type { SessionUser } from "./auth";
import {
  defaultAllows,
  isLockedPermission,
  PERMISSION_KEYS,
  type PermissionKey,
} from "./permissions";

async function loadAccessUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true },
  });
  return user;
}

/**
 * Resolve whether a user may perform a permission.
 * Order: suspended → locked CEO superadmin → user override → role matrix → code default.
 */
export async function can(
  userIdOrSession: string | SessionUser,
  permission: PermissionKey
): Promise<boolean> {
  const userId =
    typeof userIdOrSession === "string" ? userIdOrSession : userIdOrSession.id;

  const user = await loadAccessUser(userId);
  if (!user) return false;
  if (user.status === "SUSPENDED") return false;

  if (isLockedPermission(user.role, permission)) return true;

  const override = await prisma.userPermissionOverride.findUnique({
    where: {
      userId_permission: { userId: user.id, permission },
    },
  });
  if (override) return override.allowed;

  const rolePerm = await prisma.rolePermission.findUnique({
    where: {
      role_permission: { role: user.role, permission },
    },
  });
  if (rolePerm) return rolePerm.allowed;

  return defaultAllows(user.role, permission);
}

/** Effective permission list for session / UI. */
export async function getEffectivePermissions(
  userId: string
): Promise<PermissionKey[]> {
  const user = await loadAccessUser(userId);
  if (!user || user.status === "SUSPENDED") return [];

  const [roleRows, overrides] = await Promise.all([
    prisma.rolePermission.findMany({ where: { role: user.role } }),
    prisma.userPermissionOverride.findMany({ where: { userId: user.id } }),
  ]);

  const roleMap = new Map(roleRows.map((r) => [r.permission, r.allowed]));
  const overrideMap = new Map(overrides.map((o) => [o.permission, o.allowed]));

  const result: PermissionKey[] = [];
  for (const key of PERMISSION_KEYS) {
    if (isLockedPermission(user.role, key)) {
      result.push(key);
      continue;
    }
    if (overrideMap.has(key)) {
      if (overrideMap.get(key)) result.push(key);
      continue;
    }
    if (roleMap.has(key)) {
      if (roleMap.get(key)) result.push(key);
      continue;
    }
    if (defaultAllows(user.role, key)) result.push(key);
  }
  return result;
}

export async function requirePermission(
  session: SessionUser | null,
  permission: PermissionKey
): Promise<
  | { ok: true; session: SessionUser }
  | { ok: false; response: NextResponse }
> {
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = await loadAccessUser(session.id);
  if (!user || user.status === "SUSPENDED") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Account suspended or not found" },
        { status: 403 }
      ),
    };
  }

  // Keep session role fresh
  session.role = user.role;
  session.status = user.status;

  const allowed = await can(session, permission);
  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Forbidden. Missing permission: ${permission}` },
        { status: 403 }
      ),
    };
  }

  return { ok: true, session };
}
