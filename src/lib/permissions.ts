export type UserRole = "CEO" | "MANAGER" | "SECRETARY";

export const PERMISSIONS = {
  MANAGE_USERS: ["CEO"],
  CONFIGURE_WORKFLOW: ["CEO", "MANAGER"],
  VIEW_SETTINGS: ["CEO", "MANAGER"],
  MANAGE_SETTINGS: ["CEO", "MANAGER"],
  REGISTER_VEHICLE: ["CEO", "MANAGER", "SECRETARY"],
  REGISTER_DRIVER: ["CEO", "MANAGER", "SECRETARY"],
  EDIT_VEHICLE: ["CEO", "MANAGER"],
  RECORD_FUEL: ["CEO", "MANAGER", "SECRETARY"],
  RECORD_MAINTENANCE: ["CEO", "MANAGER", "SECRETARY"],
  APPROVE_MAINTENANCE: ["CEO", "MANAGER"],
  EXPORT_REPORTS: ["CEO", "MANAGER"],
  DOWNLOAD_AUDIT_LOGS: ["CEO", "MANAGER"],
} as const;

export function hasPermission(role: UserRole | string, permission: keyof typeof PERMISSIONS): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return (allowedRoles as readonly string[]).includes(role);
}

export function isLeadership(role: UserRole | string): boolean {
  return role === "CEO" || role === "MANAGER";
}
