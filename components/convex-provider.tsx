"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";
import { authClient } from "@/lib/auth-client";

import { UserPreloader } from "./user-preloader";

export function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  const convex = useMemo(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("Missing NEXT_PUBLIC_CONVEX_URL environment variable");
    }
    return new ConvexReactClient(convexUrl);
  }, []);

  return (
    <ConvexBetterAuthProvider
      client={convex}
      authClient={authClient}
      initialToken={initialToken}
    >
      <UserPreloader />
      {children}
    </ConvexBetterAuthProvider>
  );
}

