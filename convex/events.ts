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
          .collect(),
      ),
    );

    const allEvents = [...userEvents, ...groupEventsLists.flat()];
    const eventsById = new Map<string, (typeof allEvents)[number]>();
    for (const event of allEvents) {
      eventsById.set(event._id.toString(), event);
    }
    const sortedEvents = Array.from(eventsById.values()).sort(
      (a, b) => a.startTime - b.startTime,
    );
    return args.k ? sortedEvents.slice(0, args.k) : sortedEvents;
  },
});

// Helper function to enrich events with source information
const enrichEventsWithSource = async (
  events: any[],
  userId: any,
  ctx: any,
): Promise<any[]> => {
  const conversations = await ctx.db.query("conversations").collect();
  const userGroupMap = new Map<string, any>();

  conversations.forEach((conv: any) => {
    if (conv.isGroup) {
      userGroupMap.set(`group_${conv._id.toString()}`, conv);
    }
  });

  const enrichedEvents = await Promise.all(
    events.map(async (event: any) => {
      let source = "personal";
      let sourceName = "Personal";

      if (event.createdBy === userId) {
        source = "personal";
        sourceName = "Personal";
      } else if (event.workspaceId) {
        source = "group";
        const group = userGroupMap.get(event.workspaceId);
        if (group) {
          sourceName = group.name || "Group";
        }
      } else if (!event.isPrivate) {
        source = "public";
        sourceName = "Public";
      }

      return {
        _id: event._id,
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        createdBy: event.createdBy,
        source,
        sourceName,
        workspaceId: event.workspaceId,
      };
    }),
  );

  return enrichedEvents;
};

// Get upcoming events for the current user (next 1-3 events)
// Includes personal, group, and public events
export const getUpcomingEventsForCurrentUser = query({
  args: {
    userId: v.id("users"),
    k: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const k = args.k || 3; // Default to 3 upcoming events

    // Get all conversations where user is a participant (for group events)
    const conversations = await ctx.db.query("conversations").collect();
    const userGroupIds = new Set(
      conversations
        .filter((conv: any) => {
          const isGroup = conv.isGroup === true;
          const isParticipant =
            conv.participants && conv.participants.includes(args.userId);
          const isActive =
            !conv.leftParticipants ||
            !conv.leftParticipants.includes(args.userId);
          return isGroup && isParticipant && isActive;
        })
        .map((conv: any) => `group_${conv._id.toString()}`),
    );

    // Get user's personal events (created by user and not workspace-specific)
    const userEvents = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("createdBy", args.userId))
      .collect();

    const futureUserEvents = userEvents.filter(
      (e: any) => e.endTime >= now && !e.workspaceId,
    );

    // Get group events from groups where user is a member
    const allGroupEvents: any[] = [];
    for (const groupId of Array.from(userGroupIds)) {
      const groupEvents = await ctx.db
        .query("events")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", groupId))
        .collect();
      allGroupEvents.push(...groupEvents);
    }

    const futureGroupEvents = allGroupEvents.filter(
      (e: any) => e.endTime >= now,
    );

    // Get public events (isPrivate !== true or undefined, and no workspace)
    const publicEvents = await ctx.db
      .query("events")
      .withIndex("by_start_time")
      .collect();

    const futurePublicEvents = publicEvents.filter(
      (e: any) =>
        e.endTime >= now &&
        (!e.isPrivate || e.isPrivate === false) &&
        !e.workspaceId,
    );

    // Combine all events, remove duplicates by ID
    const allEventsMap = new Map<string, any>();

    futureUserEvents.forEach((e: any) => {
      allEventsMap.set(e._id.toString(), { ...e, source: "personal" });
    });

    futureGroupEvents.forEach((e: any) => {
      if (!allEventsMap.has(e._id.toString())) {
        allEventsMap.set(e._id.toString(), { ...e, source: "group" });
      }
    });

    futurePublicEvents.forEach((e: any) => {
      if (!allEventsMap.has(e._id.toString())) {
        allEventsMap.set(e._id.toString(), { ...e, source: "public" });
      }
    });

    // Get group name for group events
    const enrichedEvents = await Promise.all(
      Array.from(allEventsMap.values()).map(async (event: any) => {
        let groupName: string | undefined;
        if (event.source === "group" && event.workspaceId) {
          const groupId = event.workspaceId.replace("group_", "");
          const group = await ctx.db.get(groupId as any);
          groupName =
            group && "name" in group ? (group.name as string) : undefined;
        }

        return {
          _id: event._id,
          title: event.title,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          createdBy: event.createdBy,
          source: event.source,
          sourceName:
            groupName || (event.source === "personal" ? "Personal" : "Public"),
          workspaceId: event.workspaceId,
        };
      }),
    );

    // Sort by start time and return top k
    enrichedEvents.sort((a: any, b: any) => a.startTime - b.startTime);
    return enrichedEvents.slice(0, k);
  },
});

// Get all user events with source information and optional filtering
export const getAllUserEventsWithSource = query({
  args: {
    userId: v.id("users"),
    filter: v.optional(
      v.union(
        v.literal("all"),
        v.literal("personal"),
        v.literal("groups"),
        v.literal("public"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const filter = args.filter || "all";
    const limit = args.limit || undefined;

    // Get all conversations where user is a participant (for group events)
    const conversations = await ctx.db.query("conversations").collect();
    const userGroupIds = new Set(
      conversations
        .filter((conv: any) => {
          const isGroup = conv.isGroup === true;
          const isParticipant =
            conv.participants && conv.participants.includes(args.userId);
          const isActive =
            !conv.leftParticipants ||
            !conv.leftParticipants.includes(args.userId);
          return isGroup && isParticipant && isActive;
        })
        .map((conv: any) => `group_${conv._id.toString()}`),
    );

    // Get user's personal events (created by user and not workspace-specific)
    const userEvents = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("createdBy", args.userId))
      .collect();

    const futureUserEvents = userEvents.filter(
      (e: any) => e.endTime >= now && !e.workspaceId,
    );

    // Get group events from groups where user is a member
    const allGroupEvents: any[] = [];
    for (const groupId of Array.from(userGroupIds)) {
      const groupEvents = await ctx.db
        .query("events")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", groupId))
        .collect();
      allGroupEvents.push(...groupEvents);
    }

    const futureGroupEvents = allGroupEvents.filter(
      (e: any) => e.endTime >= now,
    );

    // Get public events (isPrivate !== true or undefined, and no workspace)
    const publicEvents = await ctx.db
      .query("events")
      .withIndex("by_start_time")
      .collect();

    const futurePublicEvents = publicEvents.filter(
      (e: any) =>
        e.endTime >= now &&
        (!e.isPrivate || e.isPrivate === false) &&
        !e.workspaceId,
    );

    // Combine all events based on filter, remove duplicates by ID
    const allEventsMap = new Map<string, any>();

    if (filter === "all" || filter === "personal") {
      futureUserEvents.forEach((e: any) => {
        allEventsMap.set(e._id.toString(), { ...e, source: "personal" });
      });
    }

    if (filter === "all" || filter === "groups") {
      futureGroupEvents.forEach((e: any) => {
        if (!allEventsMap.has(e._id.toString())) {
          allEventsMap.set(e._id.toString(), { ...e, source: "group" });
        }
      });
    }

    if (filter === "all" || filter === "public") {
      futurePublicEvents.forEach((e: any) => {
        if (!allEventsMap.has(e._id.toString())) {
          allEventsMap.set(e._id.toString(), { ...e, source: "public" });
        }
      });
    }

    // Get group name for group events
    const enrichedEvents = await Promise.all(
      Array.from(allEventsMap.values()).map(async (event: any) => {
        let groupName: string | undefined;
        if (event.source === "group" && event.workspaceId) {
          const groupId = event.workspaceId.replace("group_", "");
          const group = await ctx.db.get(groupId as any);
          groupName =
            group && "name" in group ? (group.name as string) : undefined;
        }

        return {
          _id: event._id,
          title: event.title,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          createdBy: event.createdBy,
          source: event.source,
          sourceName:
            groupName ||
            (event.source === "personal"
              ? "Personal"
              : event.source === "groups"
                ? "Group"
                : "Public"),
          workspaceId: event.workspaceId,
        };
      }),
    );

    // Sort by start time
    enrichedEvents.sort((a: any, b: any) => a.startTime - b.startTime);

    // Apply limit if specified
    if (limit) {
      return enrichedEvents.slice(0, limit);
    }
    return enrichedEvents;
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

export const getById = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.eventId);
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
