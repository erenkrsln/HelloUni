import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Sucht einen Benutzer nach seinem Benutzernamen
 * Wird von NextAuth verwendet, um Anmeldedaten während des Logins zu validieren
 */
export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    
    return user;
  },
});

/**
 * Registriert einen neuen Benutzer in der Datenbank
 * Validiert, dass der Benutzername eindeutig ist, bevor der Benutzer erstellt wird
 * 
 * @param name - Vollständiger Name des Benutzers
 * @param username - Eindeutiger Benutzername für Login
 * @param passwordHash - Bereits gehashtes Passwort (Hashing erfolgt im Client/API)
 */
export const registerUser = mutation({
  args: {
    name: v.string(),
    username: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Prüfen, ob der Benutzername bereits existiert
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existingUser) {
      throw new Error("Der Benutzername wird bereits verwendet");
    }

    // Neuen Benutzer erstellen
    const userId = await ctx.db.insert("users", {
      name: args.name,
      username: args.username,
      passwordHash: args.passwordHash,
      // Optionale Felder können später im Profil hinzugefügt werden
    });

    return userId;
  },
});

/**
 * Ruft einen Benutzer nach seiner ID ab
 * Wird nach dem Login verwendet, um Benutzerinformationen zu erhalten
 */
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    
    // passwordHash aus Sicherheitsgründen nicht zurückgeben
    if (user) {
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    
    return null;
  },
});

