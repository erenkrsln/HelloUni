"use client";

import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Sonst feuert Better Auth bei jedem Tab-Wechsel erneut /get-session; kurz isPending → „Lädt…“-Flackern.
  session: {
    refetchOnWindowFocus: false,
  },
  plugins: [convexClient(), magicLinkClient()],
});

export const { useSession, signIn, signOut, signUp } = authClient;
