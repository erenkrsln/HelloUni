import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Gibt das gespeicherte Theme des Nutzers zurück.
 * Verwendet den gleichen Email-basierten Lookup wie useCurrentUser().
 */
export const getUserTheme = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) return null;
    return user.theme ?? null;
  },
});

/**
 * Setzt das Theme des Nutzers.
 * Validiert serverseitig, dass nur erlaubte Werte gespeichert werden.
 */
export const setUserTheme = mutation({
  args: {
    userId: v.id("users"),
    theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
  },
  handler: async (ctx, args) => {
    // Prüfe, dass der Nutzer existiert
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Nutzer nicht gefunden.");
    }

    await ctx.db.patch(args.userId, { theme: args.theme });
  },
});

/**
 * Gibt zurück, ob die Vorlesefunktion für den Nutzer aktiviert ist.
 */
export const getSpeechAssistance = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) return null;
    return user.speechAssistanceEnabled ?? false;
  },
});

/**
 * Setzt die Vorlesefunktion des Nutzers.
 */
export const setSpeechAssistance = mutation({
  args: {
    userId: v.id("users"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Nutzer nicht gefunden.");
    }

    await ctx.db.patch(args.userId, { speechAssistanceEnabled: args.enabled });
  },
});
