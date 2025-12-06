import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * API Route zur Registrierung neuer Benutzer
 * Hasht das Passwort mit bcrypt vor dem Speichern in Convex
 */
export async function POST(request: Request) {
  try {
    const { name, username, password } = await request.json();

    // Pflichtfelder validieren
    if (!name || !username || !password) {
      return NextResponse.json(
        { error: "Alle Felder sind erforderlich" },
        { status: 400 }
      );
    }

    // Minimale Passwortlänge validieren
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Das Passwort muss mindestens 6 Zeichen lang sein" },
        { status: 400 }
      );
    }

    // Passwort hashen
    const passwordHash = await bcrypt.hash(password, 10);

    // Benutzer in Convex registrieren
    const userId = await convex.mutation(api.auth.registerUser, {
      name,
      username,
      passwordHash,
    });

    return NextResponse.json(
      { success: true, userId },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Fehler bei der Benutzerregistrierung:", error);
    
    // Fehler bei doppeltem Benutzernamen behandeln
    if (error.message?.includes("bereits verwendet") || error.message?.includes("in use")) {
      return NextResponse.json(
        { error: "Der Benutzername wird bereits verwendet" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Fehler bei der Benutzerregistrierung" },
      { status: 500 }
    );
  }
}

