import { createClient } from "@libsql/client";
import { prisma } from "./prisma";
import { uploadLocalImageToCloudinary, uploadLocalDocumentToCloudinary } from "./cloudinary";
import { existsSync } from "fs";
import { join } from "path";

export interface SyncStatusInfo {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  pendingCount: number;
  conflictCount: number;
  lastError: string | null;
}

let syncInProgress = false;
let lastSyncTimestamp: Date | null = null;
let lastSyncError: string | null = null;
let isOnlineState = true;

function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) return null;
  return createClient({ url, authToken });
}

export async function checkConnectivity(): Promise<boolean> {
  const client = getTursoClient();
  if (!client) {
    isOnlineState = false;
    return false;
  }
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 3500)
    );
    await Promise.race([client.execute("SELECT 1;"), timeout]);
    isOnlineState = true;
    return true;
  } catch {
    isOnlineState = false;
    return false;
  }
}

/**
 * Upload pending local images to Cloudinary when online.
 */
export async function syncPendingImages(): Promise<{ uploaded: number; failed: number }> {
  let uploaded = 0;
  let failed = 0;

  try {
    const pendingImages = await prisma.vehicleImage.findMany({
      where: {
        syncStatus: "PENDING",
        localFilePath: { not: null },
        deletedAt: null,
      },
      include: { vehicle: true },
    });

    for (const img of pendingImages) {
      if (!img.localFilePath || !existsSync(img.localFilePath)) {
        continue;
      }

      // If already a Cloudinary URL, skip re-uploading file
      if (img.publicId && img.url.startsWith("http")) {
        continue;
      }

      try {
        const folder = `faco/vehicles/${img.vehicle?.code || "general"}`;
        const cloudResult = await uploadLocalImageToCloudinary(img.localFilePath, folder);

        await prisma.vehicleImage.update({
          where: { id: img.id },
          data: {
            url: cloudResult.url,
            publicId: cloudResult.publicId,
            updatedAtLocal: new Date(),
          },
        });
        uploaded++;
      } catch (err) {
        console.warn(`[Sync] Failed uploading image ${img.id} to Cloudinary:`, err);
        failed++;
      }
    }
  } catch (err) {
    console.error("[Sync] Error scanning pending images:", err);
  }

  return { uploaded, failed };
}

/**
 * Upload pending local compliance documents to Cloudinary when online.
 */
export async function syncPendingDocuments(): Promise<{ uploaded: number; failed: number }> {
  let uploaded = 0;
  let failed = 0;

  try {
    const pendingDocs = await prisma.document.findMany({
      where: {
        fileUrl: { startsWith: "/uploads/" },
        deletedAt: null,
      },
      include: { vehicle: true, driver: true },
    });

    for (const doc of pendingDocs) {
      const fullPath = join(process.cwd(), "public", doc.fileUrl.replace(/^\//, ""));
      if (!existsSync(fullPath)) {
        continue;
      }

      try {
        const folder = doc.vehicle
          ? `faco/documents/vehicles/${doc.vehicle.code}`
          : doc.driver
          ? `faco/documents/drivers/${doc.driver.licenseNumber}`
          : "faco/documents/general";

        const cloudResult = await uploadLocalDocumentToCloudinary(fullPath, folder);

        await prisma.document.update({
          where: { id: doc.id },
          data: {
            fileUrl: cloudResult.url,
            synced: false,
            syncStatus: "PENDING",
            updatedAtLocal: new Date(),
          },
        });
        uploaded++;
      } catch (err: any) {
        console.warn(`[Sync] Failed uploading document ${doc.id} to Cloudinary:`, err.message);
        failed++;
      }
    }
  } catch (err) {
    console.error("[Sync] Error scanning pending documents:", err);
  }

  return { uploaded, failed };
}

/**
 * Natural conflict targets for upserting into Turso
 */
const CONFLICT_TARGETS: Record<string, string> = {
  Branch: "code",
  User: "email",
  Role: "name",
  RolePermission: "role, permission",
  Driver: "licenseNumber",
  Vehicle: "code",
};

/**
 * Convert an object to safe SQL columns and params for libSQL
 */
function toSqlUpsert(table: string, record: Record<string, any>) {
  const keys = Object.keys(record).filter((k) => record[k] !== undefined);
  const cols = keys.map((k) => `"${k}"`).join(", ");
  const placeholders = keys.map(() => "?").join(", ");
  
  const conflictTarget = CONFLICT_TARGETS[table] || "id";
  const conflictCols = conflictTarget.split(",").map((s) => s.trim());

  const updates = keys
    .filter((k) => !conflictCols.includes(k))
    .map((k) => `"${k}" = excluded."${k}"`)
    .join(", ");

  const values = keys.map((k) => {
    const val = record[k];
    if (val instanceof Date) return val.toISOString();
    if (typeof val === "boolean") return val ? 1 : 0;
    return val;
  });

  const sql = `
    INSERT INTO "${table}" (${cols})
    VALUES (${placeholders})
    ON CONFLICT(${conflictTarget}) DO UPDATE SET ${updates};
  `;

  return { sql, args: values };
}

/**
 * Push all local mutations with syncStatus = 'PENDING' or synced = false to Turso
 */
export async function pushLocalChangesToTurso(): Promise<{ pushedCount: number; errors: string[] }> {
  const client = getTursoClient();
  if (!client) return { pushedCount: 0, errors: ["Turso credentials missing"] };

  let pushedCount = 0;
  const errors: string[] = [];

  const models = [
    { name: "Branch", delegate: prisma.branch },
    { name: "Role", delegate: prisma.role },
    { name: "User", delegate: prisma.user },
    { name: "RolePermission", delegate: prisma.rolePermission },
    { name: "UserPermissionOverride", delegate: prisma.userPermissionOverride },
    { name: "Driver", delegate: prisma.driver },
    { name: "Vehicle", delegate: prisma.vehicle },
    { name: "VehicleAssignment", delegate: prisma.vehicleAssignment },
    { name: "VehicleImage", delegate: prisma.vehicleImage },
    { name: "MaintenanceRecord", delegate: prisma.maintenanceRecord },
    { name: "PartInstallation", delegate: prisma.partInstallation },
    { name: "Expense", delegate: prisma.expense },
    { name: "Document", delegate: prisma.document },
    { name: "Approval", delegate: prisma.approval },
    { name: "AuditLog", delegate: prisma.auditLog },
    { name: "ContactMessage", delegate: prisma.contactMessage },
  ];

  for (const m of models) {
    try {
      const pendingRows = await (m.delegate as any).findMany({
        where: {
          OR: [{ synced: false }, { syncStatus: "PENDING" }],
        },
      });

      for (const row of pendingRows) {
        try {
          const payload = { ...row, synced: true, syncStatus: "SYNCED", lastSyncedAt: new Date() };
          const { sql, args } = toSqlUpsert(m.name, payload);
          await client.execute({ sql, args });

          await (m.delegate as any).update({
            where: { id: row.id },
            data: {
              synced: true,
              syncStatus: "SYNCED",
              lastSyncedAt: new Date(),
            },
          });
          pushedCount++;
        } catch (itemErr: any) {
          errors.push(`Failed pushing ${m.name}:${row.id}: ${itemErr.message}`);
          await (m.delegate as any).update({
            where: { id: row.id },
            data: { syncStatus: "ERROR" },
          }).catch(() => {});
        }
      }
    } catch (modelErr: any) {
      errors.push(`Error reading pending ${m.name}: ${modelErr.message}`);
    }
  }

  return { pushedCount, errors };
}

/**
 * Find local row by unique natural key or ID
 */
async function findLocalMatch(table: string, delegate: any, remoteRow: any) {
  if (table === "Branch" && remoteRow.code) {
    const byCode = await delegate.findUnique({ where: { code: remoteRow.code } });
    if (byCode) return byCode;
  }
  if (table === "User" && remoteRow.email) {
    const byEmail = await delegate.findUnique({ where: { email: remoteRow.email } });
    if (byEmail) return byEmail;
  }
  if (table === "Role" && remoteRow.name) {
    const byName = await delegate.findUnique({ where: { name: remoteRow.name } });
    if (byName) return byName;
  }
  if (table === "RolePermission" && remoteRow.role && remoteRow.permission) {
    const byRolePerm = await delegate.findUnique({
      where: { role_permission: { role: remoteRow.role, permission: remoteRow.permission } },
    });
    if (byRolePerm) return byRolePerm;
  }
  if (table === "Driver" && remoteRow.licenseNumber) {
    const byLic = await delegate.findUnique({ where: { licenseNumber: remoteRow.licenseNumber } });
    if (byLic) return byLic;
  }
  if (table === "Vehicle" && remoteRow.code) {
    const byCode = await delegate.findUnique({ where: { code: remoteRow.code } });
    if (byCode) return byCode;
  }
  return delegate.findUnique({ where: { id: String(remoteRow.id) } });
}

function parseDateValue(val: any): Date | null {
  if (val === undefined || val === null || val === "") return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === "number") return new Date(val);
  if (typeof val === "string") {
    if (/^\d+$/.test(val)) {
      const num = Number(val);
      return isNaN(num) ? null : new Date(num);
    }
    let iso = val.trim();
    // SQLite CURRENT_TIMESTAMP produces 'YYYY-MM-DD HH:MM:SS' in UTC without offset.
    // Parse explicitly as UTC so local timezones (e.g. UTC+1) don't lag by 1 hour.
    if (iso.includes(" ") && !iso.includes("T") && !iso.includes("Z")) {
      iso = iso.replace(" ", "T") + "Z";
    }
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Fast targeted pull for ContactMessage records from Turso
 */
export async function pullContactMessagesFromTurso(): Promise<number> {
  const client = getTursoClient();
  if (!client) return 0;

  let pulled = 0;
  try {
    const res = await client.execute(`SELECT * FROM "ContactMessage" WHERE "deletedAt" IS NULL ORDER BY "createdAt" DESC;`);
    for (const remoteRow of res.rows) {
      const id = String(remoteRow.id);
      const existing = await prisma.contactMessage.findUnique({ where: { id } }).catch(() => null);

      const sanitized: any = { ...remoteRow };
      sanitized.synced = true;
      sanitized.syncStatus = "SYNCED";
      sanitized.lastSyncedAt = new Date();
      sanitized.createdAt = parseDateValue(remoteRow.createdAt) || new Date();
      sanitized.updatedAt = parseDateValue(remoteRow.updatedAt) || new Date();
      if (remoteRow.updatedAtLocal) sanitized.updatedAtLocal = parseDateValue(remoteRow.updatedAtLocal);
      if (remoteRow.deletedAt) sanitized.deletedAt = parseDateValue(remoteRow.deletedAt);

      if (!existing) {
        try {
          await prisma.contactMessage.create({ data: sanitized });
          pulled++;
        } catch {
          await prisma.$executeRawUnsafe(
            `INSERT OR IGNORE INTO "ContactMessage" ("id", "name", "email", "phone", "subject", "message", "status", "createdAt", "updatedAt", "synced", "syncStatus", "lastSyncedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'SYNCED', CURRENT_TIMESTAMP);`,
            sanitized.id,
            sanitized.name,
            sanitized.email,
            sanitized.phone || null,
            sanitized.subject,
            sanitized.message,
            sanitized.status || "UNREAD",
            sanitized.createdAt.getTime(),
            sanitized.updatedAt.getTime()
          ).catch(() => {});
          pulled++;
        }
      } else {
        // Refresh local timestamp and status from remote
        await prisma.contactMessage.update({
          where: { id },
          data: {
            createdAt: sanitized.createdAt,
            updatedAt: sanitized.updatedAt,
          },
        }).catch(() => {});
      }
    }
  } catch (err: any) {
    console.warn("[Sync] Quick pull contact messages failed:", err.message);
  }
  return pulled;
}

/**
 * Pull remote changes from Turso into local SQLite
 */
export async function pullRemoteChangesFromTurso(): Promise<{ pulledCount: number; conflictsCount: number }> {
  const client = getTursoClient();
  if (!client) return { pulledCount: 0, conflictsCount: 0 };

  let pulledCount = 0;
  let conflictsCount = 0;

  // Turn off foreign keys temporarily for batch sync reconciliation
  await prisma.$executeRawUnsafe("PRAGMA foreign_keys = OFF;").catch(() => {});

  const tables = [
    { name: "Branch", delegate: prisma.branch },
    { name: "Role", delegate: prisma.role },
    { name: "User", delegate: prisma.user },
    { name: "RolePermission", delegate: prisma.rolePermission },
    { name: "UserPermissionOverride", delegate: prisma.userPermissionOverride },
    { name: "Driver", delegate: prisma.driver },
    { name: "Vehicle", delegate: prisma.vehicle },
    { name: "VehicleAssignment", delegate: prisma.vehicleAssignment },
    { name: "VehicleImage", delegate: prisma.vehicleImage },
    { name: "MaintenanceRecord", delegate: prisma.maintenanceRecord },
    { name: "PartInstallation", delegate: prisma.partInstallation },
    { name: "Expense", delegate: prisma.expense },
    { name: "Document", delegate: prisma.document },
    { name: "Approval", delegate: prisma.approval },
    { name: "ContactMessage", delegate: prisma.contactMessage },
  ];

  for (const t of tables) {
    try {
      const res = await client.execute(`SELECT * FROM "${t.name}";`);
      for (const remoteRow of res.rows) {
        const local = await findLocalMatch(t.name, t.delegate, remoteRow);

        const remoteUpdated =
          parseDateValue(remoteRow.updatedAtLocal) ||
          parseDateValue(remoteRow.updatedAt) ||
          new Date(0);

        const sanitized: any = { ...remoteRow };
        sanitized.synced = true;
        sanitized.syncStatus = "SYNCED";
        sanitized.lastSyncedAt = new Date();

        for (const key of Object.keys(sanitized)) {
          if (key === "isPrimary" || key === "isSystem" || key === "allowed" || key === "read") {
            sanitized[key] = Boolean(sanitized[key]);
          }
        }

        const dateFields = [
          "createdAt", "updatedAt", "deletedAt", "startDate", "endDate",
          "nextServiceDate", "date", "expiryDate", "licenseExpiry",
          "suspendedAt", "lastSyncedAt", "updatedAtLocal"
        ];
        for (const df of dateFields) {
          if (sanitized[df] !== undefined && sanitized[df] !== null) {
            sanitized[df] = parseDateValue(sanitized[df]);
          }
        }

        if (local && (local.synced === false || local.syncStatus === "PENDING")) {
          // Conflict
          const localUpdated =
            parseDateValue(local.updatedAtLocal) ||
            parseDateValue(local.updatedAt) ||
            new Date(0);

          if (remoteUpdated.getTime() > localUpdated.getTime()) {
            conflictsCount++;
            await prisma.syncConflict.create({
              data: {
                entity: t.name,
                entityId: local.id,
                localData: JSON.stringify(local),
                remoteData: JSON.stringify(remoteRow),
                resolved: true,
                resolution: "REMOTE_WON",
                resolvedAt: new Date(),
              },
            });

            if (local.id !== String(remoteRow.id)) {
              await prisma.$executeRawUnsafe(`UPDATE "${t.name}" SET id = ? WHERE id = ?;`, String(remoteRow.id), local.id);
              if (t.name === "Vehicle") {
                await prisma.$executeRawUnsafe(`UPDATE MaintenanceRecord SET vehicleId = ? WHERE vehicleId = ?;`, String(remoteRow.id), local.id);
                await prisma.$executeRawUnsafe(`UPDATE Expense SET vehicleId = ? WHERE vehicleId = ?;`, String(remoteRow.id), local.id);
                await prisma.$executeRawUnsafe(`UPDATE VehicleImage SET vehicleId = ? WHERE vehicleId = ?;`, String(remoteRow.id), local.id);
                await prisma.$executeRawUnsafe(`UPDATE VehicleAssignment SET vehicleId = ? WHERE vehicleId = ?;`, String(remoteRow.id), local.id);
                await prisma.$executeRawUnsafe(`UPDATE Document SET vehicleId = ? WHERE vehicleId = ?;`, String(remoteRow.id), local.id);
              }
            }

            await (t.delegate as any).update({
              where: { id: String(remoteRow.id) },
              data: sanitized,
            });
            pulledCount++;
          } else {
            conflictsCount++;
            await prisma.syncConflict.create({
              data: {
                entity: t.name,
                entityId: local.id,
                localData: JSON.stringify(local),
                remoteData: JSON.stringify(remoteRow),
                resolved: true,
                resolution: "LOCAL_WON",
                resolvedAt: new Date(),
              },
            });
          }
        } else if (local) {
          // Update existing local record and align ID
          if (local.id !== String(remoteRow.id)) {
            await prisma.$executeRawUnsafe(`UPDATE "${t.name}" SET id = ? WHERE id = ?;`, String(remoteRow.id), local.id);
            if (t.name === "Vehicle") {
              await prisma.$executeRawUnsafe(`UPDATE MaintenanceRecord SET vehicleId = ? WHERE vehicleId = ?;`, String(remoteRow.id), local.id);
              await prisma.$executeRawUnsafe(`UPDATE Expense SET vehicleId = ? WHERE vehicleId = ?;`, String(remoteRow.id), local.id);
              await prisma.$executeRawUnsafe(`UPDATE VehicleImage SET vehicleId = ? WHERE vehicleId = ?;`, String(remoteRow.id), local.id);
              await prisma.$executeRawUnsafe(`UPDATE VehicleAssignment SET vehicleId = ? WHERE vehicleId = ?;`, String(remoteRow.id), local.id);
              await prisma.$executeRawUnsafe(`UPDATE Document SET vehicleId = ? WHERE vehicleId = ?;`, String(remoteRow.id), local.id);
            }
          }
          await (t.delegate as any).update({
            where: { id: String(remoteRow.id) },
            data: sanitized,
          });
          pulledCount++;
        } else {
          // Create new local record
          await (t.delegate as any).create({
            data: sanitized,
          });
          pulledCount++;
        }
      }
    } catch (err: any) {
      console.warn(`[Sync] Pull failed for table ${t.name}:`, err.message);
    }
  }

  // Restore foreign keys
  await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON;").catch(() => {});

  return { pulledCount, conflictsCount };
}

/**
 * Execute a full bidirectional sync cycle
 */
export async function runFullSync(): Promise<{
  success: boolean;
  images: { uploaded: number; failed: number };
  documents?: { uploaded: number; failed: number };
  pulled: number;
  pushed: number;
  conflicts: number;
  error?: string;
}> {
  if (syncInProgress) {
    return {
      success: false,
      images: { uploaded: 0, failed: 0 },
      documents: { uploaded: 0, failed: 0 },
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      error: "Sync already in progress",
    };
  }

  syncInProgress = true;
  lastSyncError = null;

  try {
    const online = await checkConnectivity();
    if (!online) {
      lastSyncError = "Device is offline. Changes saved locally.";
      syncInProgress = false;
      return {
        success: false,
        images: { uploaded: 0, failed: 0 },
        documents: { uploaded: 0, failed: 0 },
        pulled: 0,
        pushed: 0,
        conflicts: 0,
        error: lastSyncError || undefined,
      };
    }

    // 1. Sync pending local images to Cloudinary
    const images = await syncPendingImages();

    // 1b. Sync pending local documents to Cloudinary
    const documents = await syncPendingDocuments();

    // 2. Pull remote changes from Turso
    const { pulledCount, conflictsCount } = await pullRemoteChangesFromTurso();

    // 3. Push local changes to Turso
    const { pushedCount, errors } = await pushLocalChangesToTurso();

    lastSyncTimestamp = new Date();
    syncInProgress = false;

    if (errors.length > 0) {
      lastSyncError = errors.join("; ");
    }

    return {
      success: errors.length === 0,
      images,
      documents,
      pulled: pulledCount,
      pushed: pushedCount,
      conflicts: conflictsCount,
      error: lastSyncError || undefined,
    };
  } catch (err: any) {
    syncInProgress = false;
    lastSyncError = err.message || "Sync failed";
    return {
      success: false,
      images: { uploaded: 0, failed: 0 },
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      error: lastSyncError || undefined,
    };
  }
}

/**
 * Get current sync metrics and state
 */
export async function getSyncStatus(): Promise<SyncStatusInfo> {
  let pendingCount = 0;
  let conflictCount = 0;

  try {
    const [pVeh, pDrv, pImg, pMaint, cLogs] = await Promise.all([
      prisma.vehicle.count({ where: { OR: [{ synced: false }, { syncStatus: "PENDING" }] } }),
      prisma.driver.count({ where: { OR: [{ synced: false }, { syncStatus: "PENDING" }] } }),
      prisma.vehicleImage.count({ where: { OR: [{ synced: false }, { syncStatus: "PENDING" }] } }),
      prisma.maintenanceRecord.count({ where: { OR: [{ synced: false }, { syncStatus: "PENDING" }] } }),
      prisma.syncConflict.count({ where: { resolved: false } }),
    ]);

    pendingCount = pVeh + pDrv + pImg + pMaint;
    conflictCount = cLogs;
  } catch {
    // Local DB might be busy
  }

  return {
    isOnline: isOnlineState,
    isSyncing: syncInProgress,
    lastSyncedAt: lastSyncTimestamp,
    pendingCount,
    conflictCount,
    lastError: lastSyncError,
  };
}
