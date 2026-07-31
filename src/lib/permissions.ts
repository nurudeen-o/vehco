import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import type { SessionUser } from "./auth";

export type UserRole = "CEO" | "MANAGER" | "SECRETARY";

export const USER_ROLES: UserRole[] = ["CEO", "MANAGER", "SECRETARY"];

export const PERMISSION_KEYS = [
  "MANAGE_USERS",
  "MANAGE_ROLE_PERMISSIONS",
  "CONFIGURE_WORKFLOW",
  "VIEW_SETTINGS",
  "MANAGE_SETTINGS",
  "REGISTER_VEHICLE",
  "REGISTER_DRIVER",
  "EDIT_VEHICLE",
  "RECORD_FUEL",
  "RECORD_MAINTENANCE",
  "RECORD_EXPENSE",
  "APPROVE_MAINTENANCE",
  "VIEW_APPROVALS",
  "EXPORT_REPORTS",
  "VIEW_ANALYTICS",
  "DOWNLOAD_AUDIT_LOGS",
  "VIEW_DOCUMENTS",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

/** Default role → allowed permissions (used for seed + fallback). */
export const DEFAULT_PERMISSIONS: Record<PermissionKey, readonly UserRole[]> = {
  MANAGE_USERS: ["CEO"],
  MANAGE_ROLE_PERMISSIONS: ["CEO"],
  CONFIGURE_WORKFLOW: ["CEO", "MANAGER"],
  VIEW_SETTINGS: ["CEO", "MANAGER"],
  MANAGE_SETTINGS: ["CEO", "MANAGER"],
  REGISTER_VEHICLE: ["CEO", "MANAGER", "SECRETARY"],
  REGISTER_DRIVER: ["CEO", "MANAGER", "SECRETARY"],
  EDIT_VEHICLE: ["CEO", "MANAGER"],
  RECORD_FUEL: ["CEO", "MANAGER", "SECRETARY"],
  RECORD_MAINTENANCE: ["CEO", "MANAGER", "SECRETARY"],
  RECORD_EXPENSE: ["CEO", "MANAGER", "SECRETARY"],
  APPROVE_MAINTENANCE: ["CEO", "MANAGER"],
  VIEW_APPROVALS: ["CEO", "MANAGER"],
  EXPORT_REPORTS: ["CEO", "MANAGER"],
  VIEW_ANALYTICS: ["CEO", "MANAGER"],
  DOWNLOAD_AUDIT_LOGS: ["CEO", "MANAGER"],
  VIEW_DOCUMENTS: ["CEO", "MANAGER", "SECRETARY"],
};

/** Legacy alias used by older call sites. */
export const PERMISSIONS = DEFAULT_PERMISSIONS;

/** Superadmin cells that cannot be turned off for CEO. */
export const LOCKED_PERMISSIONS: ReadonlyArray<{
  role: UserRole;
  permission: PermissionKey;
}> = [
  { role: "CEO", permission: "MANAGE_USERS" },
  { role: "CEO", permission: "MANAGE_ROLE_PERMISSIONS" },
];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  MANAGE_USERS: "Manage users",
  MANAGE_ROLE_PERMISSIONS: "Configure role permissions",
  CONFIGURE_WORKFLOW: "Configure approval workflow",
  VIEW_SETTINGS: "View settings",
  MANAGE_SETTINGS: "Manage settings",
  REGISTER_VEHICLE: "Register vehicles",
  REGISTER_DRIVER: "Register drivers",
  EDIT_VEHICLE: "Edit vehicles / assignments",
  RECORD_FUEL: "Record fuel",
  RECORD_MAINTENANCE: "Record maintenance",
  RECORD_EXPENSE: "Record expenses",
  APPROVE_MAINTENANCE: "Approve maintenance",
  VIEW_APPROVALS: "View approvals",
  EXPORT_REPORTS: "Export reports",
  VIEW_ANALYTICS: "View analytics",
  DOWNLOAD_AUDIT_LOGS: "Download audit logs",
  VIEW_DOCUMENTS: "View documents",
};

export const PERMISSION_GROUPS: {
  label: string;
  permissions: PermissionKey[];
}[] = [
  {
    label: "Administration",
    permissions: [
      "MANAGE_USERS",
      "MANAGE_ROLE_PERMISSIONS",
      "VIEW_SETTINGS",
      "MANAGE_SETTINGS",
      "CONFIGURE_WORKFLOW",
    ],
  },
  {
    label: "Fleet",
    permissions: ["REGISTER_VEHICLE", "REGISTER_DRIVER", "EDIT_VEHICLE"],
  },
  {
    label: "Operations",
    permissions: [
      "RECORD_FUEL",
      "RECORD_MAINTENANCE",
      "RECORD_EXPENSE",
      "VIEW_DOCUMENTS",
    ],
  },
  {
    label: "Governance",
    permissions: [
      "VIEW_APPROVALS",
      "APPROVE_MAINTENANCE",
      "VIEW_ANALYTICS",
      "EXPORT_REPORTS",
      "DOWNLOAD_AUDIT_LOGS",
    ],
  },
];

export function isLockedPermission(role: string, permission: string): boolean {
  return LOCKED_PERMISSIONS.some(
    (l) => l.role === role && l.permission === permission
  );
}

export function defaultAllows(role: string, permission: PermissionKey): boolean {
  const allowed = DEFAULT_PERMISSIONS[permission];
  return (allowed as readonly string[]).includes(role);
}

/** Sync check against code defaults only (UI fallback before session loads). */
export function hasPermission(
  role: UserRole | string,
  permission: PermissionKey | keyof typeof PERMISSIONS
): boolean {
  if (isLockedPermission(role, permission) && role === "CEO") return true;
  return defaultAllows(role, permission as PermissionKey);
}

export function isLeadership(role: UserRole | string): boolean {
  return role === "CEO" || role === "MANAGER";
}

export function isValidRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

type AccessUser = {
  id: string;
  role: string;
  status: string;
};

async function loadAccessUser(userId: string): Promise<AccessUser | null> {
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

/** Build default RolePermission rows for seed / ensure. */
export function buildDefaultRolePermissionRows(): {
  role: UserRole;
  permission: PermissionKey;
  allowed: boolean;
}[] {
  const rows: {
    role: UserRole;
    permission: PermissionKey;
    allowed: boolean;
  }[] = [];
  for (const role of USER_ROLES) {
    for (const permission of PERMISSION_KEYS) {
      rows.push({
        role,
        permission,
        allowed: defaultAllows(role, permission),
      });
    }
  }
  return rows;
}
