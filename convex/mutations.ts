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

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});


