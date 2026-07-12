import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { headers } from "next/headers";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Leitet die Convex-Site-URL ab (identisch zur Logik in auth-server.ts).
 */
function convexSiteUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim() || process.env.CONVEX_SITE_URL?.trim();
  if (explicit) return explicit;

  const cloud = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (cloud?.includes(".convex.cloud")) {
    return cloud.replace(/\.convex\.cloud\/?$/i, ".convex.site");
  }
  return "";
}

/**
 * POST /api/auth/delete-account
 * 
 * Löscht den Account des aktuell authentifizierten Nutzers:
 * 1. Verifiziert die Session über BetterAuth (via get-session Endpoint)
 * 2. Löscht alle Convex-User-Daten über die deleteUserAccount-Mutation
 * 
 * SICHERHEIT: Die E-Mail wird serverseitig aus der BetterAuth-Session gelesen,
 * niemals vom Client akzeptiert. Nur der authentifizierte Nutzer kann seinen
 * eigenen Account löschen.
 */
export async function POST() {
  try {
    // 1. Session verifizieren über BetterAuth get-session Endpoint
    const headersList = await headers();
    const cookieHeader = headersList.get("cookie") || "";

    if (!cookieHeader) {
      return NextResponse.json(
        { error: "Nicht authentifiziert." },
        { status: 401 }
      );
    }

    // BetterAuth-Session abrufen über den Convex HTTP-Actions-Endpunkt
    // Der [...all] catch-all in /api/auth/ leitet an BetterAuth weiter
    const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const sessionRes = await fetch(`${siteUrl}/api/auth/get-session`, {
      headers: { cookie: cookieHeader },
    });

    if (!sessionRes.ok) {
      return NextResponse.json(
        { error: "Session konnte nicht verifiziert werden." },
        { status: 401 }
      );
    }

    const sessionData = await sessionRes.json();
    const userEmail = sessionData?.user?.email;

    if (!userEmail || typeof userEmail !== "string") {
      return NextResponse.json(
        { error: "E-Mail konnte nicht aus der Session ermittelt werden." },
        { status: 401 }
      );
    }

    // 2. Convex-Daten löschen (alle User-Daten in allen Tabellen)
    // Die Mutation verifiziert die E-Mail intern über den by_email Index
    await convex.mutation(api.mutations.deleteUserAccount, {
      email: userEmail,
    });

    // 3. BetterAuth-Session und User-Daten werden über den signOut am Client bereinigt
    // Die BetterAuth user/session/account Tabellen werden durch den
    // Convex-BetterAuth-Adapter automatisch bereinigt, wenn der User sich abmeldet
    // und keine matching User-Daten mehr vorhanden sind.

    // Optional: BetterAuth-Tabellen explizit bereinigen
    // Dies ist best-effort und nicht kritisch, da die Convex-User-Daten
    // bereits gelöscht wurden und die BetterAuth-Session invalidiert wird.
    try {
      const site = convexSiteUrl();
      if (site) {
        // Revoke aktuelle Session über BetterAuth
        await fetch(`${siteUrl}/api/auth/revoke-session`, {
          method: "POST",
          headers: {
            cookie: cookieHeader,
            "content-type": "application/json",
          },
          body: JSON.stringify({ token: sessionData?.session?.token }),
        });
      }
    } catch {
      // Best-effort: Session-Revoke fehlgeschlagen, Client wird signOut aufrufen
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[delete-account] Error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Account konnte nicht gelöscht werden.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
