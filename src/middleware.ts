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

  // NOTE: Role/permission enforcement is intentionally handled by Node handlers and pages,
  // not middleware. The session cookie now stores only userId, so role here would be stale.
  // getSession() re-loads the user from the DB on every request, and APIs use requirePermission().

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
