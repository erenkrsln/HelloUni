import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/about", "/imprint", "/privacy", "/auth/callback"]);

// Werden vor dem Login aufgerufen, es kann also noch kein Session-Cookie existieren.
const PUBLIC_API_PATHS = new Set(["/api/check-user", "/api/register-profile"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.length > 20 && pathname.length < 50 && /^\/[a-z0-9]+$/.test(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  if (PUBLIC_PATHS.has(pathname) || PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const hasSessionCookie =
    req.cookies.has("better-auth.session_token") ||
    req.cookies.has("__Secure-better-auth.session_token");

  if (!hasSessionCookie) {
    // Ein Redirect auf "/" würde bei fetch()-Aufrufen die HTML-Startseite mit Status 200
    // zurückliefern, statt eines auswertbaren Fehlers.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
    }

    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.webmanifest).*)",
  ],
};
