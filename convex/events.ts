import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ✅ NEW — add this
export const listByUser = query({
    args: {
        userId: v.id("users"),
        k: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let q = ctx.db
            .query("events")
            .withIndex("by_user", (q) => q.eq("createdBy", args.userId))
            .order("asc");

        if (args.k) return await q.take(args.k);
        return await q.collect();
    },
});

// existing code — keep
export const listPublic = query({
    args: {
        k: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Filter for isPrivate === false. 
        // Since we don't have an index on isPrivate, we can filter in memory or use a filter.
        // For efficiency with pagination (take k), it's better to use an index if possible, 
        // but without one, we'll scan by start time and filter.
        // Warning: This might be slow if there are many private events.
        let q = ctx.db
            .query("events")
            .withIndex("by_start_time")
            .order("asc")
            .filter((q) => q.eq(q.field("isPrivate"), false));

        if (args.k) {
            return await q.take(args.k);
        }
        return await q.collect();
    },
});

export const create = mutation({
    args: {
        title: v.string(),
        description: v.optional(v.string()),
        startTime: v.number(),
        endTime: v.number(),
        location: v.optional(v.string()),
        // userId is not needed in args as we use ctx.auth or pass it? 
        // The user request says "create(...) -> already exists; ensure isPrivate defaults to true if undefined"
        // The existing create took userId as arg. I should probably trust the auth if available, but for now I will stick to existing pattern or check auth.
        // Existing pattern used args.userId. I will keep it but verifying it matches auth would be better. 
        // However, standard Convex pattern is using ctx.auth. 
        // Let's stick to the prompt: "ensure isPrivate defaults to true if undefined".
        userId: v.id("users"),
        isPrivate: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw new Error("User not found");
        }

        return await ctx.db.insert("events", {
            title: args.title,
            description: args.description,
            startTime: args.startTime,
            endTime: args.endTime,
            location: args.location,
            createdBy: args.userId,
            isPrivate: args.isPrivate ?? true, // Default to true
        });
    },
});

export const update = mutation({
    args: {
        eventId: v.id("events"),
        userId: v.id("users"), // To verify ownership
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        startTime: v.optional(v.number()),
        endTime: v.optional(v.number()),
        location: v.optional(v.string()),
        isPrivate: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const event = await ctx.db.get(args.eventId);
        if (!event) throw new Error("Event not found");

        if (event.createdBy !== args.userId) {
            throw new Error("Unauthorized: Only the owner can edit this event");
        }

        await ctx.db.patch(args.eventId, {
            ...(args.title !== undefined && { title: args.title }),
            ...(args.description !== undefined && { description: args.description }),
            ...(args.startTime !== undefined && { startTime: args.startTime }),
            ...(args.endTime !== undefined && { endTime: args.endTime }),
            ...(args.location !== undefined && { location: args.location }),
            ...(args.isPrivate !== undefined && { isPrivate: args.isPrivate }),
        });
    },
});

export const remove = mutation({
    args: {
        eventId: v.id("events"),
        userId: v.id("users"), // To verify ownership
    },
    handler: async (ctx, args) => {
        const event = await ctx.db.get(args.eventId);
        if (!event) throw new Error("Event not found");

        if (event.createdBy !== args.userId) {
            throw new Error("Unauthorized: Only the owner can delete this event");
        }

        await ctx.db.delete(args.eventId);
    },
});
