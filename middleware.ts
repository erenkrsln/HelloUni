import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routen, die ohne Login zugänglich sind
const PUBLIC_PATHS = [
  "/",
  "/about",
  "/imprint",
  "/privacy",
  "/auth/magic-link-fehler",
];

// Routen, die nie durch die Middleware blockiert werden sollen
const ALWAYS_ALLOWED = [
  "/api/auth",
  "/api/register",
  "/api/migrate-auth",
  "/_next",
  "/favicon.ico",
];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Convex-ID-artige Pfade abfangen (z.B. /kg283gptp92vz...)
  if (pathname.length > 20 && pathname.length < 50 && /^\/[a-z0-9]+$/.test(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  // Immer erlaubte Pfade durchlassen
  if (ALWAYS_ALLOWED.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Öffentliche Seiten durchlassen
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Session-Cookie von Better Auth prüfen
  // Better Auth setzt 'better-auth.session_token' nach erfolgreichem Login
  const sessionCookie =
    req.cookies.get("better-auth.session_token") ??
    req.cookies.get("__Secure-better-auth.session_token");

  if (!sessionCookie?.value) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.webmanifest).*)",
  ],
};
