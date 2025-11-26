import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// User erstellen (für Registrierung)
export const createUser = mutation({
  args: {
    name: v.string(),
    username: v.string(),
    email: v.optional(v.string()),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Prüfen ob Username bereits existiert
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existingUser) {
      throw new Error("Benutzername bereits vergeben");
    }

    // User anlegen mit Standard-Profilbild
    const userId = await ctx.db.insert("users", {
      name: args.name,
      username: args.username,
      email: args.email,
      passwordHash: args.passwordHash,
      profileImage: "/default-avatar.png", // Standard-Profilbild für alle neuen User
      createdAt: Date.now(),
    });

    return userId;
  },
});

// User per Username finden (für Login)
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

// User per ID abrufen
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Aktuellen User abrufen (mit Auth)
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", identity.subject))
      .first();

    return user;
  },
});

// User-Profil aktualisieren
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    username: v.string(), // Username des aktuellen Users für Auth-Check
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    bio: v.optional(v.string()),
    profileImage: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    university: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Prüfen ob der User sich selbst bearbeitet
    if (user.username !== args.username) {
      throw new Error("Not authorized to update this user");
    }

    const { userId, username, ...updates } = args;
    await ctx.db.patch(userId, updates);
    return userId;
  },
});

// Migration: Alle User ohne username mit einem Standard-Username versehen
// Diese Funktion kann einmalig aufgerufen werden, um bestehende User zu aktualisieren
export const migrateUsersWithoutUsername = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    let updated = 0;
    
    for (const user of allUsers) {
      // Prüfen ob username fehlt oder leer ist
      if (!user.username || user.username === "") {
        // Erstelle einen Standard-Username basierend auf dem Namen oder der ID
        const defaultUsername = user.name 
          ? user.name.toLowerCase().replace(/\s+/g, "") + user._id.slice(-4)
          : "user" + user._id.slice(-8);
        
        await ctx.db.patch(user._id, {
          username: defaultUsername,
        });
        updated++;
      }
    }
    
    return { updated, total: allUsers.length };
  },
});

