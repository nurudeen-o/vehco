import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type SessionPayload = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

function readSession(request: NextRequest): SessionPayload | null {
  const cookie = request.cookies.get("vehco_session");
  if (!cookie?.value) return null;
  try {
    return JSON.parse(
      Buffer.from(cookie.value, "base64").toString("utf-8")
    ) as SessionPayload;
  } catch {
    return null;
  }
}

function isLeadership(role?: string) {
  return role === "CEO" || role === "MANAGER";
}

export function middleware(request: NextRequest) {
  const session = readSession(request);
  const { pathname } = request.nextUrl;

  const isPublicPath = pathname === "/login" || pathname.startsWith("/qr");
  const isApiAuth = pathname.startsWith("/api/auth") || pathname.startsWith("/api/test-db");
  const isStatic = pathname.includes(".") || pathname.startsWith("/_next");

  if (isStatic || isApiAuth) {
    return NextResponse.next();
  }

  if (!session && !isPublicPath) {
    // Allow unauthenticated only on public paths
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Settings: CEO / Manager only
  if (pathname.startsWith("/settings") || pathname.startsWith("/api/settings")) {
    if (!session || !isLeadership(session.role)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden. CEO or Manager only." },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Audit log downloads: CEO / Manager only
  if (pathname.startsWith("/api/audit-logs")) {
    if (!session || !isLeadership(session.role)) {
      return NextResponse.json(
        { error: "Forbidden. Only CEO and Manager can download audit logs." },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
