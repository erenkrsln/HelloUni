import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * NextAuth-Handler für App Router
 * Verwaltet alle Authentifizierungsrouten: /api/auth/signin, /api/auth/signout, etc.
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

