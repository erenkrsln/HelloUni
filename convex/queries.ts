import { query } from "./_generated/server";
import { v } from "convex/values";

export const getFeed = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_created")
      .order("desc")
      .collect();

    // Wenn userId vorhanden ist, hole alle Like-Status in einem Batch
    // Dies verhindert N+1 Queries und liefert die Daten beim ersten Render
    let userLikesMap: Map<string, boolean> = new Map();
    if (args.userId !== undefined && args.userId !== null) {
      try {
        // Hole alle Likes für diesen User
        // Da der Index by_user_post zusammengesetzt ist, filtern wir manuell
        const allLikes = await ctx.db
          .query("likes")
          .collect();
        
        // Filtere Likes für diesen User und erstelle eine Map
        const userLikes = allLikes.filter((like) => like.userId === args.userId);
        userLikes.forEach((like) => {
          userLikesMap.set(like.postId as string, true);
        });
      } catch (error) {
        // Falls Abfrage fehlschlägt, fahre ohne Like-Status fort
        // Dies verhindert, dass die gesamte Query fehlschlägt
        console.error("Error fetching user likes:", error);
      }
    }

    const postsWithUsers = await Promise.all(
      posts.map(async (post) => {
        const user = await ctx.db.get(post.userId);
        let imageUrl = post.imageUrl;

        // Convert storage ID to URL if it exists
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = (await ctx.storage.getUrl(imageUrl as any)) ?? imageUrl;
        }

        // Füge Like-Status hinzu, wenn userId vorhanden ist
        // Konvertiere Id<"posts"> zu String für Map-Lookup
        const isLiked = (args.userId !== undefined && args.userId !== null) 
          ? userLikesMap.has(post._id as string) 
          : undefined;

        return {
          ...post,
          imageUrl,
          user,
          isLiked, // Like-Status direkt mitliefern
        };
      })
    );

    return postsWithUsers;
  },
});

export const getPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return null;

    const user = await ctx.db.get(post.userId);
    return {
      ...post,
      user,
    };
  },
});

export const getUserLikes = query({
  args: { userId: v.id("users"), postId: v.id("posts") },
  handler: async (ctx, args) => {
    const like = await ctx.db
      .query("likes")
      .withIndex("by_user_post", (q) =>
        q.eq("userId", args.userId).eq("postId", args.postId)
      )
      .first();

    return like !== null;
  },
});

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getUserPosts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const postsWithUsers = await Promise.all(
      posts.map(async (post) => {
        const user = await ctx.db.get(post.userId);
        let imageUrl = post.imageUrl;

        // Convert storage ID to URL if it exists
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = (await ctx.storage.getUrl(imageUrl as any)) ?? imageUrl;
        }

        return {
          ...post,
          imageUrl,
          user,
        };
      })
    );

    return postsWithUsers;
  },
});

// HINWEIS: Diese Query ist temporär für Testing
// In Produktion sollte die userId von der NextAuth-Session übergeben werden
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db.query("users").first();
    return user;
  },
});

// Neue Query, die userId von der Session empfängt
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});


