import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  ALLOWED_EMAIL_ERROR,
  isAllowedUniversityEmail,
} from "./allowedEmail";

/**
 * Speichert Registrierungsdaten temporär, bevor der Magic Link geklickt wird.
 * Kein Login erforderlich – der Nutzer ist zu diesem Zeitpunkt noch nicht authentifiziert.
 */
export const savePendingRegistration = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    username: v.string(),
    studiengang: v.optional(v.string()),
  },
  handler: async (ctx, { email, name, username, studiengang }) => {
    if (!isAllowedUniversityEmail(email)) {
      throw new Error(ALLOWED_EMAIL_ERROR);
    }

    const existing = await ctx.db
      .query("pendingRegistrations")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { name, username, studiengang, createdAt: Date.now() });
      return;
    }

    await ctx.db.insert("pendingRegistrations", {
      email,
      name,
      username,
      studiengang,
      createdAt: Date.now(),
    });
  },
});

/**
 * Liest gespeicherte Registrierungsdaten für eine E-Mail aus.
 * Wird auf der /setup-Seite nach dem Magic-Link-Klick aufgerufen.
 */
export const getPendingRegistration = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("pendingRegistrations")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

/**
 * Erstellt ein neues Nutzerprofil oder verknüpft ein bestehendes (Legacy-Migration).
 * Wird vom Client direkt nach dem Better Auth Sign-up aufgerufen.
 * Die Better Auth User-ID wird sicher aus dem JWT ausgelesen.
 */
export const createOrLinkUserProfile = mutation({
  args: {
    username: v.string(),
    name: v.string(),
    studiengang: v.optional(v.string()),
  },
  handler: async (ctx, { username, name, studiengang }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Nicht authentifiziert");

    const betterAuthUserId = identity.subject;
    const email = identity.email ?? undefined;

    if (email !== undefined && !isAllowedUniversityEmail(email)) {
      throw new Error(ALLOWED_EMAIL_ERROR);
    }

    // Prüfen ob bereits ein Profil mit diesem Username existiert (Legacy-Nutzer)
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (existing) {
      // Bestehendes Profil mit Better Auth verknüpfen (einmalige Migration)
      const patch: Record<string, unknown> = {};
      if (!existing.betterAuthUserId) patch.betterAuthUserId = betterAuthUserId;
      if (email && !existing.email) patch.email = email;
      if (studiengang && !existing.major) patch.major = studiengang;
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
      }
      return existing._id;
    }

    // Neues Profil anlegen
    return await ctx.db.insert("users", {
      name,
      username,
      email,
      major: studiengang,
      betterAuthUserId,
      createdAt: Date.now(),
    });
  },
});

/**
 * Gibt den aktuell eingeloggten Nutzer zurück.
 * Nutzt ctx.auth.getUserIdentity() aus dem Better Auth JWT.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Suche zuerst über betterAuthUserId (schnell, nach Migration)
    const byAuthId = await ctx.db
      .query("users")
      .withIndex("by_better_auth_id", (q) =>
        q.eq("betterAuthUserId", identity.subject)
      )
      .first();

    const user = byAuthId ?? null;

    if (!user) return null;

    // Profilbild-URL auflösen (Storage ID → URL)
    let imageUrl = user.image;
    if (imageUrl && !imageUrl.startsWith("http")) {
      imageUrl = (await ctx.storage.getUrl(imageUrl as any)) ?? imageUrl;
    }

    // passwordHash niemals zurückgeben
    const { passwordHash, ...userWithoutPassword } = user;
    return { ...userWithoutPassword, image: imageUrl };
  },
});

/**
 * Prüft ob eine E-Mail-Adresse zu einem bestehenden Konto gehört.
 * Wird auf der Auth-Seite vor dem Login-Magic-Link geprüft.
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();
  },
});

/**
 * Sucht einen Benutzer nach seinem Benutzernamen.
 * Wird für die Migrations-Überprüfung benötigt.
 */
export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
  },
});

/**
 * Ruft einen Benutzer nach seiner Convex ID ab.
 */
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) return null;

    const { passwordHash, ...userWithoutPassword } = user;

    let imageUrl = userWithoutPassword.image;
    if (imageUrl && !imageUrl.startsWith("http")) {
      imageUrl = (await ctx.storage.getUrl(imageUrl as any)) ?? imageUrl;
    }

    return { ...userWithoutPassword, image: imageUrl };
  },
});

/**
 * Registriert einen neuen Benutzer (Legacy – wird nach vollständiger Migration entfernt).
 * Neue Nutzer werden über Better Auth registriert, dieses Mutation bleibt für
 * Rückwärtskompatibilität erhalten.
 */
export const registerUser = mutation({
  args: {
    name: v.string(),
    username: v.string(),
    passwordHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existingUser) {
      throw new Error("Der Benutzername wird bereits verwendet");
    }

    const userId = await ctx.db.insert("users", {
      name: args.name,
      username: args.username,
      passwordHash: args.passwordHash,
      createdAt: Date.now(),
    });

    return userId;
  },
});
