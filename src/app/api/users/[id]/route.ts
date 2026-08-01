import { NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
        suspendedAt: true,
        suspendedReason: true,
        branchId: true,
        branch: { select: { id: true, name: true, code: true } },
        createdAt: true,
        updatedAt: true,
        permissionOverrides: {
          select: { permission: true, allowed: true, updatedAt: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const gate = await requirePermission(session, "MANAGE_USERS");
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const body = await req.json();

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Self-protection
    if (id === gate.session.id) {
      if (body.status === "SUSPENDED") {
        return NextResponse.json(
          { error: "You cannot suspend your own account" },
          { status: 400 }
        );
      }
      if (body.role && body.role !== target.role) {
        return NextResponse.json(
          { error: "You cannot change your own role" },
          { status: 400 }
        );
      }
    }

    const data: {
      name?: string;
      role?: string;
      status?: string;
      suspendedAt?: Date | null;
      suspendedReason?: string | null;
      password?: string;
      branchId?: string | null;
    } = {};

    const auditParts: string[] = [];

    if (typeof body.name === "string" && body.name.trim()) {
      data.name = body.name.trim();
      if (data.name !== target.name) {
        auditParts.push(`name: ${target.name} → ${data.name}`);
      }
    }

    if (body.role !== undefined) {
      const role = String(body.role).toUpperCase();
      const roleExists = await prisma.role.findUnique({ where: { name: role } });
      if (!roleExists) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      if (role !== target.role) {
        // Prevent demoting/removing last active CEO
        if (target.role === "CEO" && role !== "CEO") {
          const activeCeos = await prisma.user.count({
            where: { role: "CEO", status: "ACTIVE", id: { not: id } },
          });
          if (activeCeos === 0) {
            return NextResponse.json(
              { error: "Cannot demote the last active Superadmin (CEO)" },
              { status: 400 }
            );
          }
        }
        data.role = role;
        auditParts.push(`role: ${target.role} → ${role}`);
      }
    }

    if (body.status !== undefined) {
      const status = String(body.status).toUpperCase();
      if (status !== "ACTIVE" && status !== "SUSPENDED") {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      if (status !== target.status) {
        if (status === "SUSPENDED" && target.role === "CEO") {
          const activeCeos = await prisma.user.count({
            where: { role: "CEO", status: "ACTIVE", id: { not: id } },
          });
          if (activeCeos === 0) {
            return NextResponse.json(
              { error: "Cannot suspend the last active Superadmin (CEO)" },
              { status: 400 }
            );
          }
        }
        data.status = status;
        if (status === "SUSPENDED") {
          data.suspendedAt = new Date();
          data.suspendedReason =
            typeof body.suspendedReason === "string"
              ? body.suspendedReason.trim() || null
              : null;
          auditParts.push(
            `suspended${data.suspendedReason ? `: ${data.suspendedReason}` : ""}`
          );
        } else {
          data.suspendedAt = null;
          data.suspendedReason = null;
          auditParts.push("reactivated");
        }
      }
    }

    if (typeof body.password === "string" && body.password.length > 0) {
      if (body.password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }
      data.password = await hashPassword(body.password);
      auditParts.push("password reset");
    }

    if (body.branchId !== undefined) {
      data.branchId = body.branchId || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        suspendedAt: true,
        suspendedReason: true,
        branchId: true,
        updatedAt: true,
      },
    });

    if (auditParts.length > 0) {
      await prisma.auditLog.create({
        data: {
          userId: gate.session.id,
          action:
            data.status === "SUSPENDED"
              ? "SUSPEND_USER"
              : data.status === "ACTIVE" && target.status === "SUSPENDED"
                ? "REACTIVATE_USER"
                : "UPDATE_USER",
          entity: "User",
          entityId: id,
          details: `${gate.session.name} updated ${target.name} (${target.email}): ${auditParts.join("; ")}`,
        },
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
