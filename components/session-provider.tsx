"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Wrapper für NextAuth SessionProvider
 * Ermöglicht die Verwendung von useSession in Client-Komponenten
 */
export function NextAuthSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

