import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * NextAuth-Middleware zum Schutz von Routen
 * Leitet automatisch zu "/" um, wenn der Benutzer nicht authentifiziert ist
 */
export default withAuth(
  function middleware(req) {
    // Ignoriere Requests, die wie Convex-IDs aussehen (z.B. kg283gptp92vz668wnk2t73sbs7wwpzz)
    // Diese sollten nicht als Routen behandelt werden
    const pathname = req.nextUrl.pathname;
    // Convex-IDs sind typischerweise 20+ Zeichen lang und bestehen nur aus Kleinbuchstaben und Zahlen
    if (pathname.length > 20 && pathname.length < 50 && /^\/[a-z0-9]+$/.test(pathname)) {
      // Sieht aus wie eine Convex-ID, leite zu 404 um oder blockiere den Request
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (
          req.nextUrl.pathname === "/" ||
          req.nextUrl.pathname === "/about" ||
          req.nextUrl.pathname === "/imprint" ||
          req.nextUrl.pathname === "/privacy"
        ) {
          return true;
        }
        // Für alle anderen Routen ist Authentifizierung erforderlich
        return !!token;
      },
    },
    pages: {
      signIn: "/",
    },
  }
);

// Konfigurieren, welche Routen geschützt werden sollen
export const config = {
  matcher: [
    /*
     * Alle Routen schützen außer:
     * - /api/auth/* (NextAuth-Routen)
     * - /api/register (Registrierungsroute)
     * - /_next/* (statische Next.js-Dateien)
     * - /favicon.ico
     * - öffentliche Dateien
     */
    "/((?!api/auth|api/register|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.webmanifest).*)",
  ],
};

