import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ✅ NEW — add this
export const listByUser = query({
    args: {
        userId: v.id("users"),
        k: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const conversations = await ctx.db.query("conversations").collect();
        const groupWorkspaceIds = conversations
            .filter((conv) => conv.isGroup && conv.participants.includes(args.userId))
            .map((conv) => `group_${conv._id}`);

        const userEvents = await ctx.db
            .query("events")
            .withIndex("by_user", (q) => q.eq("createdBy", args.userId))
            .order("asc")
            .collect();

        const groupEventsLists = await Promise.all(
            groupWorkspaceIds.map((workspaceId) =>
                ctx.db
                    .query("events")
                    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
                    .order("asc")
                    .collect()
            )
        );

        const allEvents = [...userEvents, ...groupEventsLists.flat()];
        const eventsById = new Map<string, typeof allEvents[number]>();
        for (const event of allEvents) {
            eventsById.set(event._id.toString(), event);
        }
        const sortedEvents = Array.from(eventsById.values()).sort((a, b) => a.startTime - b.startTime);
        return args.k ? sortedEvents.slice(0, args.k) : sortedEvents;
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

export const listByWorkspace = query({
    args: {
        workspaceId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("events")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
            .order("asc")
            .collect();
    },
});

export const create = mutation({
    args: {
        title: v.string(),
        description: v.optional(v.string()),
        startTime: v.number(),
        endTime: v.number(),
        location: v.optional(v.string()),
        userId: v.id("users"),
        isPrivate: v.optional(v.boolean()),
        workspaceId: v.optional(v.string()),
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
            isPrivate: args.isPrivate ?? true,
            workspaceId: args.workspaceId,
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
