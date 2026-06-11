import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Save (or refresh) a Web Push subscription for a user.
 * Upserts by endpoint so re-subscribing on the same browser doesn't create duplicates.
 */
export const saveSubscription = mutation({
  args: {
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: args.userId,
        p256dh: args.p256dh,
        auth: args.auth,
      });
      return { success: true, subscriptionId: existing._id };
    }

    const subscriptionId = await ctx.db.insert("pushSubscriptions", {
      userId: args.userId,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      createdAt: Date.now(),
    });

    return { success: true, subscriptionId };
  },
});

/**
 * Remove a subscription (called on unsubscribe / logout).
 */
export const removeSubscription = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return { success: true };
  },
});

/**
 * Whether the current user has at least one active push subscription on any device.
 */
export const hasSubscription = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    return sub !== null;
  },
});

// ─── Internal helpers used by the push delivery action ──────────────────────

/**
 * Collect all push subscriptions for a set of users.
 */
export const getSubscriptionsForUsers = internalQuery({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const results = [];
    for (const userId of args.userIds) {
      const subs = await ctx.db
        .query("pushSubscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      results.push(...subs);
    }
    return results.map((s) => ({
      endpoint: s.endpoint,
      p256dh: s.p256dh,
      auth: s.auth,
    }));
  },
});

/**
 * Delete a dead subscription (browser returned 404/410 Gone).
 */
export const deleteSubscriptionByEndpoint = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
