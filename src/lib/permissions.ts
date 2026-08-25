export type UserRole = "CEO" | "MANAGER" | "SECRETARY";

export const SYSTEM_ROLES: UserRole[] = ["CEO", "MANAGER", "SECRETARY"];

export const ROLE_LABELS: Record<UserRole, string> = {
  CEO: "Superadmin",
  MANAGER: "Admin",
  SECRETARY: "Secretary",
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] || role;
}

export const PERMISSION_KEYS = [
  "MANAGE_USERS",
  "MANAGE_ROLE_PERMISSIONS",
  "CONFIGURE_WORKFLOW",
  "VIEW_SETTINGS",
  "MANAGE_SETTINGS",
  "VIEW_VEHICLES",
  "REGISTER_VEHICLE",
  "EDIT_VEHICLE",
  "VIEW_DRIVERS",
  "REGISTER_DRIVER",
  "EDIT_DRIVER",
  "VIEW_MAINTENANCE_RECORDS",
  "RECORD_MAINTENANCE",
  "EDIT_MAINTENANCE",
  "APPROVE_MAINTENANCE",
  "VIEW_EXPENSES",
  "RECORD_EXPENSE",
  "EDIT_EXPENSE",
  "VIEW_APPROVALS",
  "EXPORT_REPORTS",
  "VIEW_ANALYTICS",
  "DOWNLOAD_AUDIT_LOGS",
  "VIEW_DOCUMENTS",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const DEFAULT_PERMISSIONS: Record<PermissionKey, readonly UserRole[]> = {
  MANAGE_USERS: ["CEO"],
  MANAGE_ROLE_PERMISSIONS: ["CEO"],
  CONFIGURE_WORKFLOW: ["CEO", "MANAGER"],
  VIEW_SETTINGS: ["CEO", "MANAGER"],
  MANAGE_SETTINGS: ["CEO", "MANAGER"],

  VIEW_VEHICLES: ["CEO", "MANAGER", "SECRETARY"],
  REGISTER_VEHICLE: ["CEO", "MANAGER"],
  EDIT_VEHICLE: ["CEO", "MANAGER"],

  VIEW_DRIVERS: ["CEO", "MANAGER", "SECRETARY"],
  REGISTER_DRIVER: ["CEO", "MANAGER"],
  EDIT_DRIVER: ["CEO", "MANAGER"],

  VIEW_MAINTENANCE_RECORDS: ["CEO", "MANAGER", "SECRETARY"],
  RECORD_MAINTENANCE: ["CEO", "MANAGER", "SECRETARY"],
  EDIT_MAINTENANCE: ["CEO", "MANAGER"],
  APPROVE_MAINTENANCE: ["CEO", "MANAGER"],

  VIEW_EXPENSES: ["CEO", "MANAGER", "SECRETARY"],
  RECORD_EXPENSE: ["CEO", "MANAGER", "SECRETARY"],
  EDIT_EXPENSE: ["CEO", "MANAGER"],

  VIEW_APPROVALS: ["CEO", "MANAGER"],
  EXPORT_REPORTS: ["CEO", "MANAGER"],
  VIEW_ANALYTICS: ["CEO", "MANAGER"],
  DOWNLOAD_AUDIT_LOGS: ["CEO", "MANAGER"],
  VIEW_DOCUMENTS: ["CEO", "MANAGER", "SECRETARY"],
};

export const PERMISSIONS = DEFAULT_PERMISSIONS;

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

  VIEW_VEHICLES: "View vehicles",
  REGISTER_VEHICLE: "Register vehicles",
  EDIT_VEHICLE: "Edit vehicles / assignments",

  VIEW_DRIVERS: "View drivers",
  REGISTER_DRIVER: "Register drivers",
  EDIT_DRIVER: "Edit drivers",

  VIEW_MAINTENANCE_RECORDS: "View maintenance records",
  RECORD_MAINTENANCE: "Record maintenance",
  EDIT_MAINTENANCE: "Edit maintenance records",
  APPROVE_MAINTENANCE: "Approve maintenance",

  VIEW_EXPENSES: "View expenses",
  RECORD_EXPENSE: "Record expenses",
  EDIT_EXPENSE: "Edit expense records",

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
    permissions: [
      "VIEW_VEHICLES",
      "REGISTER_VEHICLE",
      "EDIT_VEHICLE",
      "VIEW_DRIVERS",
      "REGISTER_DRIVER",
      "EDIT_DRIVER",
    ],
  },
  {
    label: "Operations",
    permissions: [
      "VIEW_MAINTENANCE_RECORDS",
      "RECORD_MAINTENANCE",
      "EDIT_MAINTENANCE",
      "VIEW_EXPENSES",
      "RECORD_EXPENSE",
      "EDIT_EXPENSE",
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

export function isSystemRole(role: string): role is UserRole {
  return SYSTEM_ROLES.includes(role as UserRole);
}

export function buildDefaultRolePermissionRows(): {
  role: string;
  permission: PermissionKey;
  allowed: boolean;
}[] {
  const rows: {
    role: string;
    permission: PermissionKey;
    allowed: boolean;
  }[] = [];
  for (const role of SYSTEM_ROLES) {
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
