import { query } from "./_generated/server";
import { v } from "convex/values";

export const getFeed = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_created")
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

// Batch-Abfrage aller Like-Status für einen User und mehrere Posts
export const getUserLikesBatch = query({
  args: { userId: v.id("users"), postIds: v.array(v.id("posts")) },
  handler: async (ctx, args) => {
    // Wenn keine Post-IDs vorhanden sind, gebe leeres Objekt zurück
    if (!args.postIds || args.postIds.length === 0) {
      return {};
    }
    
    try {
      // Hole alle Likes und filtere nach userId und postIds
      // Da der zusammengesetzte Index nicht nur mit userId funktioniert, holen wir alle Likes
      const allLikes = await ctx.db
        .query("likes")
        .collect();
      
      // Filtere Likes für diesen User und die relevanten Posts
      const userLikes = allLikes.filter(
        (like) => like.userId === args.userId && args.postIds.includes(like.postId)
      );
      
      // Erstelle eine Map: postId -> isLiked (als String-Keys für Record)
      const likesMap: Record<string, boolean> = {};
      userLikes.forEach((like) => {
        likesMap[like.postId as string] = true;
      });
      
      // Erstelle Ergebnis-Objekt mit allen Post-IDs (als String-Keys)
      const result: Record<string, boolean> = {};
      args.postIds.forEach((postId) => {
        result[postId as string] = likesMap[postId as string] ?? false;
      });
      
      return result;
    } catch (error) {
      // Falls Abfrage fehlschlägt, gebe leeres Objekt zurück
      // Like-Status wird dann clientseitig geladen
      return {};
    }
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


