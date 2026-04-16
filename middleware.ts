import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/about", "/imprint", "/privacy", "/auth/callback"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.length > 20 && pathname.length < 50 && /^\/[a-z0-9]+$/.test(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const hasSessionCookie =
    req.cookies.has("better-auth.session_token") ||
    req.cookies.has("__Secure-better-auth.session_token");

  if (!hasSessionCookie) {
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
