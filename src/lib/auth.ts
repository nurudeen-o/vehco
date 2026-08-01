import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { verifyPassword } from "./password";
import { getEffectivePermissions } from "./permissions-server";
import type { PermissionKey } from "./permissions";

const SESSION_COOKIE = "facotransport_session";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export { hashPassword } from "./password";

export async function validateCredentials(
  email: string,
  password: string
): Promise<{ ok: true; userId: string } | { ok: false; reason: "invalid" | "suspended" }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false, reason: "invalid" };
  const valid = await verifyPassword(password, user.password);
  if (!valid) return { ok: false, reason: "invalid" };
  if (user.status === "SUSPENDED") return { ok: false, reason: "suspended" };
  return { ok: true, userId: user.id };
}

export async function createSession(email: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  if (user.status === "SUSPENDED") return null;

  const sessionData: SessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    Buffer.from(JSON.stringify({ id: user.id })).toString("base64"),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    }
  );

  return sessionData;
}

/**
 * Read cookie, re-load user from DB for live role/status.
 * Clears session if user missing or suspended.
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE);
    if (!cookie?.value) return null;

    const raw = JSON.parse(
      Buffer.from(cookie.value, "base64").toString("utf-8")
    ) as { id?: string; email?: string; role?: string; name?: string; status?: string };

    // Support both new { id } cookies and legacy full-payload cookies
    let userId = raw.id;
    if (!userId && raw.email) {
      const byEmail = await prisma.user.findUnique({
        where: { email: raw.email },
        select: { id: true },
      });
      userId = byEmail?.id;
    }
    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user || user.status === "SUSPENDED") {
      await destroySession();
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  } catch {
    return null;
  }
}

export async function getSessionWithPermissions(): Promise<{
  user: SessionUser;
  permissions: PermissionKey[];
} | null> {
  const session = await getSession();
  if (!session) return null;
  const permissions = await getEffectivePermissions(session.id);
  return { user: session, permissions };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
