import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

/**
 * Convex HTTP-Actions-Host (*.convex.site). Auf Vercel oft vergessen – dann leiten wir
 * aus NEXT_PUBLIC_CONVEX_URL (*.convex.cloud) ab.
 */
function convexSiteUrlFromEnv(): string {
  const explicit =
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim() || process.env.CONVEX_SITE_URL?.trim();
  if (explicit) return explicit;

  const cloud = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (cloud?.includes(".convex.cloud")) {
    return cloud.replace(/\.convex\.cloud\/?$/i, ".convex.site");
  }

  throw new Error(
    "NEXT_PUBLIC_CONVEX_SITE_URL (oder NEXT_PUBLIC_CONVEX_URL mit *.convex.cloud) ist nicht gesetzt. " +
      "Für Vercel: Projekt → Settings → Environment Variables → NEXT_PUBLIC_CONVEX_SITE_URL = https://<deployment>.convex.site",
  );
}

export const {
  handler,
  preloadAuthQuery,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: convexSiteUrlFromEnv(),
});
