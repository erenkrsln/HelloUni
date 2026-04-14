import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Migrations-Endpunkt für bestehende Nutzer.
 *
 * Ablauf:
 * 1. Zugangsdaten gegen alten Convex-passwordHash prüfen
 * 2. Better Auth-Konto über den internen Sign-up-Endpunkt anlegen
 * 3. Der databaseHook in convex/betterAuth/auth.ts verknüpft das neue
 *    Better Auth-Konto automatisch mit dem bestehenden Convex-Profil
 */
export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
    }

    // Bestehendes Convex-Konto mit passwordHash suchen
    const legacyUser = await convex.query(api.auth.getUserByUsername, { username });

    if (!legacyUser?.passwordHash) {
      return NextResponse.json({ error: "Kein Legacy-Konto gefunden" }, { status: 404 });
    }

    // Passwort gegen alten Hash prüfen
    const isValid = await bcrypt.compare(password, legacyUser.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Ungültige Zugangsdaten" }, { status: 401 });
    }

    // Better Auth-Konto anlegen (ruft intern /api/auth/sign-up/email auf)
    // Synthetische Email: benutzername@hellouni.local
    const origin = request.headers.get("origin") ?? "http://localhost:3000";
    const signUpRes = await fetch(`${origin}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `${username}@hellouni.local`,
        password,
        name: legacyUser.name,
      }),
    });

    // 409 = Konto existiert bereits in Better Auth → kein Fehler
    if (!signUpRes.ok && signUpRes.status !== 409) {
      const body = await signUpRes.text();
      console.error("Better Auth sign-up failed:", body);
      return NextResponse.json({ error: "Migration fehlgeschlagen" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Migrationsfehler:", error);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
