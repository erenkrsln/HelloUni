import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const followUser = mutation({
  args: {
    followerId: v.id("users"),
    followingId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.followerId === args.followingId) {
      throw new Error("Du kannst dir nicht selbst folgen");
    }

    const existingFollow = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.followerId))
      .filter((q) => q.eq(q.field("followingId"), args.followingId))
      .first();

    if (existingFollow) {
      throw new Error("Du folgst diesem User bereits");
    }

    await ctx.db.insert("follows", {
      followerId: args.followerId,
      followingId: args.followingId,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const unfollowUser = mutation({
  args: {
    followerId: v.id("users"),
    followingId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const follow = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.followerId))
      .filter((q) => q.eq(q.field("followingId"), args.followingId))
      .first();

    if (follow) {
      await ctx.db.delete(follow._id);
      return { success: true };
    }

    return { success: false };
  },
});

export const isFollowing = query({
  args: {
    followerId: v.id("users"),
    followingId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.followerId === args.followingId) {
      return false;
    }

    const follow = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.followerId))
      .filter((q) => q.eq(q.field("followingId"), args.followingId))
      .first();

    return follow !== null;
  },
});

export const getFollowers = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", args.userId))
      .collect();

    const followers = await Promise.all(
      follows.map(async (follow) => {
        const user = await ctx.db.get(follow.followerId);
        return user;
      })
    );

    return followers.filter((user) => user !== null);
  },
});

export const getFollowing = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();

    const following = await Promise.all(
      follows.map(async (follow) => {
        const user = await ctx.db.get(follow.followingId);
        return user;
      })
    );

    return following.filter((user) => user !== null);
  },
});

export const getFollowerCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", args.userId))
      .collect();

    return follows.length;
  },
});

export const getFollowingCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();

    return follows.length;
  },
});





