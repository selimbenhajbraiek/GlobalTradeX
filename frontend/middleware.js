import { NextResponse } from "next/server";
import { decodeJwt, jwtVerify } from "jose";

const ROLE_PATHS = {
  admin: "/dashboard/admin",
  importateur: "/dashboard/importateur",
  exportateur: "/dashboard/exportateur",
  transitaire: "/dashboard/transitaire",
  courtier: "/dashboard/courtier",
};

const DASHBOARD_ROLE_SEGMENTS = new Set(Object.keys(ROLE_PATHS));

function homeForRole(role) {
  return ROLE_PATHS[role] || null;
}

/**
 * Prefer verified JWT (needs JWT_SECRET === backend SECRET_KEY).
 * In development only, if verification fails or JWT_SECRET is unset, decode
 * claims without verifying the signature so local routing still works.
 * Production always requires a valid signature when JWT_SECRET is set.
 */
async function getTokenPayload(token) {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
        algorithms: ["HS256"],
      });
      return payload;
    } catch {
      // invalid signature / expired / wrong secret
    }
  }
  if (process.env.NODE_ENV === "development") {
    try {
      return decodeJwt(token);
    } catch {
      return null;
    }
  }
  return null;
}

export async function middleware(request) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  if (pathname === "/login" || pathname === "/register") {
    if (token) {
      const payload = await getTokenPayload(token);
      const role = typeof payload?.role === "string" ? payload.role : null;
      const home = role ? homeForRole(role) : null;
      if (home) {
        return NextResponse.redirect(new URL(home, request.url));
      }
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await getTokenPayload(token);
  const role = typeof payload?.role === "string" ? payload.role : null;
  const home = role ? homeForRole(role) : null;

  if (!home || !role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return NextResponse.redirect(new URL(home, request.url));
  }

  const segments = pathname.split("/").filter(Boolean);
  const firstAfterDashboard = segments[1];
  // Non-admins may only open their own role home; admins can browse role cockpits from the sidebar.
  if (
    role !== "admin" &&
    firstAfterDashboard &&
    DASHBOARD_ROLE_SEGMENTS.has(firstAfterDashboard) &&
    firstAfterDashboard !== role
  ) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
