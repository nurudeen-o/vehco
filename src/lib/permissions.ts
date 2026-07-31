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
