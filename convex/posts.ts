import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Post erstellen
export const createPost = mutation({
  args: {
    authorId: v.id("users"),
    content: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const postId = await ctx.db.insert("posts", {
      authorId: args.authorId,
      content: args.content,
      imageUrl: args.imageUrl,
      createdAt: Date.now(),
      likes: 0,
    });

    return postId;
  },
});

// Alle Posts abrufen (Feed)
export const getPosts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_created")
      .order("desc")
      .take(limit);

    // Posts mit Author-Daten anreichern
    const postsWithAuthors = await Promise.all(
      posts.map(async (post) => {
        const author = await ctx.db.get(post.authorId);
        return {
          ...post,
          author,
        };
      })
    );

    return postsWithAuthors;
  },
});

// Posts von gefolgten Usern abrufen
export const getFollowingPosts = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();

    const followingIds = follows.map((follow) => follow.followingId);
    
    if (followingIds.length === 0) {
      return [];
    }

    const allPosts = await ctx.db
      .query("posts")
      .withIndex("by_created")
      .order("desc")
      .collect();

    const followingPosts = allPosts
      .filter((post) => followingIds.includes(post.authorId))
      .slice(0, limit);

    const postsWithAuthors = await Promise.all(
      followingPosts.map(async (post) => {
        const author = await ctx.db.get(post.authorId);
        return {
          ...post,
          author,
        };
      })
    );

    return postsWithAuthors;
  },
});

// Posts eines bestimmten Users
export const getUserPosts = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verwende zusammengesetzten Index für korrekte Sortierung nach createdAt DESC
    // NEUESTE Posts zuerst - direkt in der Datenbank sortiert
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_author_created", (q) => q.eq("authorId", args.userId))
      .order("desc") // Sortiert nach createdAt DESC (neueste zuerst)
      .collect();

    return posts;
  },
});

// Prüfen ob User einen Post geliked hat
export const isPostLiked = query({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const like = await ctx.db
      .query("likes")
      .withIndex("by_post_user", (q) =>
        q.eq("postId", args.postId).eq("userId", args.userId)
      )
      .first();

    return like !== null;
  },
});

// Alle gelikten Post-IDs für einen User abrufen
export const getLikedPostIds = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return likes.map((like) => like.postId);
  },
});

// Post liken
export const likePost = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post nicht gefunden");
    }

    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_post_user", (q) =>
        q.eq("postId", args.postId).eq("userId", args.userId)
      )
      .first();

    if (existingLike) {
      throw new Error("Post wurde bereits geliked");
    }

    await ctx.db.insert("likes", {
      postId: args.postId,
      userId: args.userId,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.postId, {
      likes: post.likes + 1,
    });

    return post.likes + 1;
  },
});

// Post entliken
export const unlikePost = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post nicht gefunden");
    }

    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_post_user", (q) =>
        q.eq("postId", args.postId).eq("userId", args.userId)
      )
      .first();

    if (!existingLike) {
      throw new Error("Post wurde nicht geliked");
    }

    await ctx.db.delete(existingLike._id);

    await ctx.db.patch(args.postId, {
      likes: Math.max(0, post.likes - 1),
    });

    return Math.max(0, post.likes - 1);
  },
});

// Post löschen
export const deletePost = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"), // User-ID wird vom Client übergeben
  },
  handler: async (ctx, args) => {
    // Hole den Post
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post nicht gefunden");
    }

    // Prüfe ob der User der Autor des Posts ist
    if (post.authorId !== args.userId) {
      throw new Error("Nur der Autor kann den Post löschen");
    }

    // Lösche den Post
    await ctx.db.delete(args.postId);
  },
});






