import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { verifyPassword } from "./password";

const SESSION_COOKIE = "vehco_session";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export { hashPassword } from "./password";

export async function validateCredentials(email: string, password: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return false;
  return verifyPassword(password, user.password);
}

export async function createSession(email: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const sessionData: SessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, Buffer.from(JSON.stringify(sessionData)).toString("base64"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return sessionData;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE);
    if (!cookie?.value) return null;
    const data = JSON.parse(Buffer.from(cookie.value, "base64").toString("utf-8"));
    if (!data.id || !data.email || !data.role) return null;
    return data as SessionUser;
  } catch {
    return null;
  }
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
