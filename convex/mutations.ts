import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Updated mutation with all new post fields
export const createPost = mutation({
  args: {
    userId: v.id("users"),
    postType: v.optional(v.union(
      v.literal("normal"),
      v.literal("spontaneous_meeting"),
      v.literal("recurring_meeting"),
      v.literal("announcement"),
      v.literal("poll")
    )),
    title: v.optional(v.string()),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    eventDate: v.optional(v.number()),
    eventTime: v.optional(v.string()),
    participantLimit: v.optional(v.number()),
    recurrencePattern: v.optional(v.string()),
    pollOptions: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const postId = await ctx.db.insert("posts", {
      userId: args.userId,
      postType: args.postType || "normal", // Default für normale Posts
      title: args.title,
      content: args.content,
      imageUrl: args.imageUrl,
      eventDate: args.eventDate,
      eventTime: args.eventTime,
      participantLimit: args.participantLimit,
      recurrencePattern: args.recurrencePattern,
      pollOptions: args.pollOptions,
      tags: args.tags,
      likesCount: 0,
      commentsCount: 0,
      participantsCount: 0, // Always set to 0 for new posts
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
    // Use a retry loop to handle write conflicts
    let retries = 0;
    const maxRetries = 5;
    
    while (retries < maxRetries) {
      try {
        const existingLike = await ctx.db
          .query("likes")
          .withIndex("by_user_post", (q) =>
            q.eq("userId", args.userId).eq("postId", args.postId)
          )
          .first();

        const post = await ctx.db.get(args.postId);
        if (!post) throw new Error("Post not found");

        if (existingLike) {
          // Unlike: delete the like and recalculate count
          await ctx.db.delete(existingLike._id);
          
          // Recalculate likesCount from actual likes to avoid race conditions
          const allLikes = await ctx.db
            .query("likes")
            .withIndex("by_post", (q) => q.eq("postId", args.postId))
            .collect();
          
          await ctx.db.patch(args.postId, {
            likesCount: allLikes.length,
          });
          return { liked: false };
        } else {
          // Like: insert the like and recalculate count
          await ctx.db.insert("likes", {
            userId: args.userId,
            postId: args.postId,
          });
          
          // Recalculate likesCount from actual likes to avoid race conditions
          const allLikes = await ctx.db
            .query("likes")
            .withIndex("by_post", (q) => q.eq("postId", args.postId))
            .collect();
          
          await ctx.db.patch(args.postId, {
            likesCount: allLikes.length,
          });
          return { liked: true };
        }
      } catch (error: any) {
        // If it's a write conflict, retry
        if (error.message?.includes("write conflict") || error.message?.includes("conflict")) {
          retries++;
          if (retries >= maxRetries) {
            throw new Error("Failed to like post after multiple retries due to write conflicts");
          }
          // Wait a bit before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.min(100 * Math.pow(2, retries), 1000)));
          continue;
        }
        // If it's a different error, throw it
        throw error;
      }
    }
    
    throw new Error("Failed to like post after multiple retries");
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

export const joinEvent = mutation({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    // Prüfe ob es ein Treffen ist
    if (post.postType !== "spontaneous_meeting" && post.postType !== "recurring_meeting") {
      throw new Error("This post is not an event");
    }

    // Prüfe ob bereits teilgenommen
    const existingParticipation = await ctx.db
      .query("participants")
      .withIndex("by_user_post", (q) =>
        q.eq("userId", args.userId).eq("postId", args.postId)
      )
      .first();

    if (existingParticipation) {
      throw new Error("Already participating");
    }

    // Prüfe Teilnehmerlimit
    if (post.participantLimit && post.participantsCount >= post.participantLimit) {
      throw new Error("Event is full");
    }

    // Teilnahme hinzufügen
    await ctx.db.insert("participants", {
      userId: args.userId,
      postId: args.postId,
      joinedAt: Date.now(),
    });

    await ctx.db.patch(args.postId, {
      participantsCount: post.participantsCount + 1,
    });

    return { success: true };
  },
});

export const leaveEvent = mutation({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    const existingParticipation = await ctx.db
      .query("participants")
      .withIndex("by_user_post", (q) =>
        q.eq("userId", args.userId).eq("postId", args.postId)
      )
      .first();

    if (!existingParticipation) {
      throw new Error("Not participating");
    }

    await ctx.db.delete(existingParticipation._id);
    await ctx.db.patch(args.postId, {
      participantsCount: Math.max(0, post.participantsCount - 1),
    });

    return { success: true };
  },
});

export const votePoll = mutation({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
    optionIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    if (post.postType !== "poll") {
      throw new Error("This post is not a poll");
    }

    if (!post.pollOptions || args.optionIndex >= post.pollOptions.length) {
      throw new Error("Invalid option");
    }

    // Prüfe ob bereits abgestimmt
    const existingVote = await ctx.db
      .query("pollVotes")
      .withIndex("by_user_post", (q) =>
        q.eq("userId", args.userId).eq("postId", args.postId)
      )
      .first();

    if (existingVote) {
      // Update existing vote
      await ctx.db.patch(existingVote._id, {
        optionIndex: args.optionIndex,
        votedAt: Date.now(),
      });
    } else {
      // Create new vote
      await ctx.db.insert("pollVotes", {
        userId: args.userId,
        postId: args.postId,
        optionIndex: args.optionIndex,
        votedAt: Date.now(),
      });
    }

    return { success: true };
  },
});
