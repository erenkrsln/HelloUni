import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserImageUrl } from "./helpers";

const ALLOWED_DOMAIN = "@th-nuernberg.de";

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) return null;

    return {
      ...user,
      image: await getUserImageUrl(ctx, user.image),
    };
  },
});

export const registerMagicLinkUser = mutation({
  args: {
    name: v.string(),
    username: v.string(),
    email: v.string(),
    major: v.string(),
    semester: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const normalizedUsername = args.username.trim();
    const normalizedName = args.name.trim();
    const normalizedMajor = args.major.trim();
    // Semester nur übernehmen, wenn gültig (1-10)
    const normalizedSemester =
      typeof args.semester === "number" &&
      args.semester >= 1 &&
      args.semester <= 10
        ? args.semester
        : undefined;

    if (!normalizedEmail.endsWith(ALLOWED_DOMAIN)) {
      throw new Error(`Nur E-Mails mit ${ALLOWED_DOMAIN} sind erlaubt.`);
    }

    const existingEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();
    if (existingEmail) {
      throw new Error("Diese E-Mail wird bereits verwendet.");
    }

    const existingUsername = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
      .first();
    if (existingUsername) {
      throw new Error("Der Benutzername wird bereits verwendet.");
    }

    return await ctx.db.insert("users", {
      name: normalizedName,
      username: normalizedUsername,
      email: normalizedEmail,
      major: normalizedMajor,
      semester: normalizedSemester,
      uni_name: "TH Nürnberg",
      createdAt: Date.now(),
    });
  },
});

