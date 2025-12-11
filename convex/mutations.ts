import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createPost = mutation({
  args: {
    userId: v.id("users"),
    content: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const postId = await ctx.db.insert("posts", {
      userId: args.userId,
      content: args.content,
      imageUrl: args.imageUrl,
      likesCount: 0,
      commentsCount: 0,
      createdAt: Date.now(),
    });

    return postId;
  },
});

export const likePost = mutation({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_user_post", (q) =>
        q.eq("userId", args.userId).eq("postId", args.postId)
      )
      .first();

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    if (existingLike) {
      await ctx.db.delete(existingLike._id);
      await ctx.db.patch(args.postId, {
        likesCount: Math.max(0, post.likesCount - 1),
      });
      return { liked: false };
    } else {
      await ctx.db.insert("likes", {
        userId: args.userId,
        postId: args.postId,
      });
      await ctx.db.patch(args.postId, {
        likesCount: post.likesCount + 1,
      });
      return { liked: true };
    }
  },
});

export const followUser = mutation({
  args: {
    followerId: v.id("users"),
    followingId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Prevent following yourself
    if (args.followerId === args.followingId) {
      throw new Error("You cannot follow yourself");
    }

    // Check if already following
    const existingFollow = await ctx.db
      .query("follows")
      .withIndex("by_follower_following", (q) =>
        q.eq("followerId", args.followerId).eq("followingId", args.followingId)
      )
      .first();

    if (existingFollow) {
      throw new Error("Already following this user");
    }

    // Create follow relationship
    await ctx.db.insert("follows", {
      followerId: args.followerId,
      followingId: args.followingId,
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
    // Find the follow relationship
    const existingFollow = await ctx.db
      .query("follows")
      .withIndex("by_follower_following", (q) =>
        q.eq("followerId", args.followerId).eq("followingId", args.followingId)
      )
      .first();

    if (!existingFollow) {
      throw new Error("Not following this user");
    }

    // Delete the follow relationship
    await ctx.db.delete(existingFollow._id);

    return { success: true };
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updates: { name?: string; image?: string; bio?: string } = {};
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.image !== undefined) {
      // If image is empty string, set to undefined to delete it
      updates.image = args.image === "" ? undefined : args.image;
    }
    if (args.bio !== undefined) {
      // If bio is empty string, set to empty string (will be treated as deleted in UI)
      const trimmedBio = args.bio.trim();
      updates.bio = trimmedBio;
    }

    await ctx.db.patch(args.userId, updates);
    return { success: true };
  },
});
