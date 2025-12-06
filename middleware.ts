import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * NextAuth-Middleware zum Schutz von Routen
 * Leitet automatisch zu "/" um, wenn der Benutzer nicht authentifiziert ist
 */
export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Zugriff auf Login-Seite ohne Authentifizierung erlauben
        if (req.nextUrl.pathname === "/") {
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
    "/((?!api/auth|api/register|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg).*)",
  ],
};

