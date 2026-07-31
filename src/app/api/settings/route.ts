import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";

// In-memory fallback when no SystemConfig table exists yet.
// Persisted via AuditLog details for demo durability across restarts is not ideal;
// we store as a singleton JSON blob in a dedicated approach using env-free file-less store.
// For production with Turso/SQLite we use AuditLog-free simple key via raw approach:
// Prefer a lightweight settings row pattern using prisma if available.

type SettingsPayload = {
  approvalWorkflow: "MANAGER_ONLY" | "MANAGER_AND_CEO";
  emailNotifications: boolean;
};

const DEFAULTS: SettingsPayload = {
  approvalWorkflow: "MANAGER_ONLY",
  emailNotifications: true,
};

// Module-level cache (works per server instance; good enough with DB audit trail)
let cachedSettings: SettingsPayload = { ...DEFAULTS };

async function loadSettings(): Promise<SettingsPayload> {
  try {
    const last = await prisma.auditLog.findFirst({
      where: { action: "UPDATE_SETTINGS", entity: "SystemSettings" },
      orderBy: { createdAt: "desc" },
    });
    if (last?.details) {
      const parsed = JSON.parse(last.details) as SettingsPayload;
      if (parsed.approvalWorkflow) {
        cachedSettings = {
          approvalWorkflow: parsed.approvalWorkflow,
          emailNotifications: !!parsed.emailNotifications,
        };
      }
    }
  } catch {
    // keep cache / defaults
  }
  return cachedSettings;
}

export async function GET() {
  const session = await getSession();
  const gate = await requirePermission(session, "VIEW_SETTINGS");
  if (!gate.ok) return gate.response;

  const settings = await loadSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  const session = await getSession();
  const gate = await requirePermission(session, "MANAGE_SETTINGS");
  if (!gate.ok) return gate.response;

  try {
    const body = await req.json();
    const next: SettingsPayload = {
      approvalWorkflow:
        body.approvalWorkflow === "MANAGER_AND_CEO" ? "MANAGER_AND_CEO" : "MANAGER_ONLY",
      emailNotifications: !!body.emailNotifications,
    };

    cachedSettings = next;

    await prisma.auditLog.create({
      data: {
        userId: gate.session.id,
        action: "UPDATE_SETTINGS",
        entity: "SystemSettings",
        entityId: "global",
        details: JSON.stringify(next),
      },
    });

    return NextResponse.json({ ok: true, ...next });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
