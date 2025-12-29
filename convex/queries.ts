import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Helper function to calculate actual comments count for a post
async function calculateCommentsCount(ctx: any, postId: Id<"posts">): Promise<number> {
  const allComments = await ctx.db
    .query("comments")
    .withIndex("by_post", (q: any) => q.eq("postId", postId))
    .collect();
  return allComments.filter((c: any) => !c.parentCommentId).length;
}

export const getFeed = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_created")
      .order("desc")
      .collect();

    // Batch-Abfrage aller Likes für diesen User
    let userLikesMap: Record<string, boolean> = {};
    if (args.userId) {
      const postIds = posts.map((p) => p._id);
      const allLikes = await ctx.db
        .query("likes")
        .collect();
      
      const userLikes = allLikes.filter(
        (like) => like.userId === args.userId && postIds.includes(like.postId)
      );
      
      userLikes.forEach((like) => {
        userLikesMap[like.postId as string] = true;
      });
    }

    const postsWithUsers = await Promise.all(
      posts.map(async (post) => {
        const user = await ctx.db.get(post.userId);
        let imageUrl = post.imageUrl;

        // Convert storage ID to URL if it exists
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = (await ctx.storage.getUrl(imageUrl as any)) ?? imageUrl;
        }

        // Convert user image storage ID to URL if it exists
        let userImageUrl = user?.image;
        if (userImageUrl && !userImageUrl.startsWith('http')) {
          userImageUrl = (await ctx.storage.getUrl(userImageUrl as any)) ?? userImageUrl;
        }

        // Calculate actual participants count for events
        let actualParticipantsCount = post.participantsCount || 0;
        if (post.postType === "spontaneous_meeting" || post.postType === "recurring_meeting") {
          const participants = await ctx.db
            .query("participants")
            .withIndex("by_post", (q) => q.eq("postId", post._id))
            .collect();
          actualParticipantsCount = participants.length;
        }

        // Calculate actual comments count (only top-level comments)
        const actualCommentsCount = await calculateCommentsCount(ctx, post._id);

        return {
          ...post,
          participantsCount: actualParticipantsCount,
          commentsCount: actualCommentsCount,
          imageUrl,
          isLiked: args.userId ? (userLikesMap[post._id as string] ?? false) : undefined,
          user: user ? {
            ...user,
            image: userImageUrl,
          } : null,
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
    const user = await ctx.db.get(args.userId);

    if (!user) {
      return null;
    }

    // Convert storage ID to URL if it exists
    let imageUrl = user.image;
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = (await ctx.storage.getUrl(imageUrl as any)) ?? imageUrl;
    }

    // Convert headerImage storage ID to URL if it exists
    let headerImageUrl = user.headerImage;
    if (headerImageUrl && !headerImageUrl.startsWith('http')) {
      headerImageUrl = (await ctx.storage.getUrl(headerImageUrl as any)) ?? headerImageUrl;
    }

    // If createdAt is not set, try to get it from the first post
    let createdAt = user.createdAt;
    if (!createdAt) {
      const firstPost = await ctx.db
        .query("posts")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("asc") // Get oldest post first
        .first();
      if (firstPost) {
        createdAt = firstPost.createdAt;
      }
    }

    return {
      ...user,
      image: imageUrl,
      headerImage: headerImageUrl,
      createdAt: createdAt,
    };
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

    // Batch-Abfrage aller Likes für diesen User
    let userLikesMap: Record<string, boolean> = {};
    if (args.userId) {
      const postIds = posts.map((p) => p._id);
      const allLikes = await ctx.db
        .query("likes")
        .collect();
      
      const userLikes = allLikes.filter(
        (like) => like.userId === args.userId && postIds.includes(like.postId)
      );
      
      userLikes.forEach((like) => {
        userLikesMap[like.postId as string] = true;
      });
    }

    const postsWithUsers = await Promise.all(
      posts.map(async (post) => {
        const user = await ctx.db.get(post.userId);
        let imageUrl = post.imageUrl;

        // Convert storage ID to URL if it exists
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = (await ctx.storage.getUrl(imageUrl as any)) ?? imageUrl;
        }

        // Convert user image storage ID to URL if it exists
        let userImageUrl = user?.image;
        if (userImageUrl && !userImageUrl.startsWith('http')) {
          userImageUrl = (await ctx.storage.getUrl(userImageUrl as any)) ?? userImageUrl;
        }

        // Calculate actual participants count for events
        let actualParticipantsCount = post.participantsCount || 0;
        if (post.postType === "spontaneous_meeting" || post.postType === "recurring_meeting") {
          const participants = await ctx.db
            .query("participants")
            .withIndex("by_post", (q) => q.eq("postId", post._id))
            .collect();
          actualParticipantsCount = participants.length;
        }

        // Calculate actual comments count (only top-level comments)
        const actualCommentsCount = await calculateCommentsCount(ctx, post._id);

        return {
          ...post,
          participantsCount: actualParticipantsCount,
          commentsCount: actualCommentsCount,
          imageUrl,
          isLiked: args.userId ? (userLikesMap[post._id as string] ?? false) : undefined,
          user: user ? {
            ...user,
            image: userImageUrl,
          } : null,
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
    const user = await ctx.db.get(args.userId);

    if (!user) {
      return null;
    }

    // Convert storage ID to URL if it exists
    let imageUrl = user.image;
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = (await ctx.storage.getUrl(imageUrl as any)) ?? imageUrl;
    }

    // Convert headerImage storage ID to URL if it exists
    let headerImageUrl = user.headerImage;
    if (headerImageUrl && !headerImageUrl.startsWith('http')) {
      headerImageUrl = (await ctx.storage.getUrl(headerImageUrl as any)) ?? headerImageUrl;
    }

    // If createdAt is not set, try to get it from the first post
    let createdAt = user.createdAt;
    if (!createdAt) {
      const firstPost = await ctx.db
        .query("posts")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("asc") // Get oldest post first
        .first();
      if (firstPost) {
        createdAt = firstPost.createdAt;
      }
    }

    return {
      ...user,
      image: imageUrl,
      headerImage: headerImageUrl,
      createdAt: createdAt,
    };
  },
});

// Search users by username for mentions autocomplete
export const searchUsers = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    if (!args.searchTerm || args.searchTerm.length < 1) {
      return [];
    }

    const searchLower = args.searchTerm.toLowerCase();
    const allUsers = await ctx.db
      .query("users")
      .collect();

    // Filter users by username (case-insensitive)
    // Skip users without username
    const matchingUsers = allUsers
      .filter(user => user.username && (
        user.username.toLowerCase().startsWith(searchLower) ||
        user.username.toLowerCase().includes(searchLower)
      ))
      .slice(0, 10); // Limit to 10 results

    // Convert storage IDs to URLs
    const usersWithImages = await Promise.all(
      matchingUsers.map(async (user) => {
        let imageUrl = user.image;
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = (await ctx.storage.getUrl(imageUrl as any)) ?? imageUrl;
        }
        return {
          _id: user._id,
          name: user.name,
          username: user.username,
          image: imageUrl,
        };
      })
    );

    return usersWithImages;
  },
});

// Query um User nach Username zu finden
export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!user) {
      return null;
    }

    // Convert storage ID to URL if it exists
    let imageUrl = user.image;
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = (await ctx.storage.getUrl(imageUrl as any)) ?? imageUrl;
    }

    // Convert headerImage storage ID to URL if it exists
    let headerImageUrl = user.headerImage;
    if (headerImageUrl && !headerImageUrl.startsWith('http')) {
      headerImageUrl = (await ctx.storage.getUrl(headerImageUrl as any)) ?? headerImageUrl;
    }

    // If createdAt is not set, try to get it from the first post
    let createdAt = user.createdAt;
    if (!createdAt) {
      const firstPost = await ctx.db
        .query("posts")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("asc") // Get oldest post first
        .first();
      if (firstPost) {
        createdAt = firstPost.createdAt;
      }
    }

    return {
      ...user,
      image: imageUrl,
      headerImage: headerImageUrl,
      createdAt: createdAt,
    };
  },
});

// Query für Following Feed - zeigt nur Posts von Usern, denen der aktuelle User folgt
export const getFollowingFeed = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Hole alle Follows des aktuellen Users
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();

    // Extrahiere die IDs der gefolgten User
    const followingIds = follows.map((follow) => follow.followingId);

    // Wenn der User niemandem folgt, gebe leeres Array zurück
    if (followingIds.length === 0) {
      return [];
    }

    // Hole alle Posts und filtere nach gefolgten Usern
    const allPosts = await ctx.db
      .query("posts")
      .withIndex("by_created")
      .order("desc")
      .collect();

    // Filtere Posts von gefolgten Usern
    const followingPosts = allPosts.filter((post) =>
      followingIds.includes(post.userId)
    );

    // Batch-Abfrage aller Likes für diesen User
    let userLikesMap: Record<string, boolean> = {};
    if (args.userId) {
      const postIds = followingPosts.map((p) => p._id);
      const allLikes = await ctx.db
        .query("likes")
        .collect();
      
      const userLikes = allLikes.filter(
        (like) => like.userId === args.userId && postIds.includes(like.postId)
      );
      
      userLikes.forEach((like) => {
        userLikesMap[like.postId as string] = true;
      });
    }

    // Erweitere Posts mit User-Informationen
    const postsWithUsers = await Promise.all(
      followingPosts.map(async (post) => {
        const user = await ctx.db.get(post.userId);
        let imageUrl = post.imageUrl;

        // Convert storage ID to URL if it exists
        if (imageUrl && !imageUrl.startsWith("http")) {
          imageUrl = (await ctx.storage.getUrl(imageUrl as any)) ?? imageUrl;
        }

        // Convert user image storage ID to URL if it exists
        let userImageUrl = user?.image;
        if (userImageUrl && !userImageUrl.startsWith('http')) {
          userImageUrl = (await ctx.storage.getUrl(userImageUrl as any)) ?? userImageUrl;
        }

        // Calculate actual participants count for events
        let actualParticipantsCount = post.participantsCount || 0;
        if (post.postType === "spontaneous_meeting" || post.postType === "recurring_meeting") {
          const participants = await ctx.db
            .query("participants")
            .withIndex("by_post", (q) => q.eq("postId", post._id))
            .collect();
          actualParticipantsCount = participants.length;
        }

        // Calculate actual comments count (only top-level comments)
        const actualCommentsCount = await calculateCommentsCount(ctx, post._id);

        return {
          ...post,
          participantsCount: actualParticipantsCount,
          commentsCount: actualCommentsCount,
          imageUrl,
          isLiked: args.userId ? (userLikesMap[post._id as string] ?? false) : undefined,
          user: user ? {
            ...user,
            image: userImageUrl,
          } : null,
        };
      })
    );

    return postsWithUsers;
  },
});

// Check if a user is following another user
export const isFollowing = query({
  args: {
    followerId: v.id("users"),
    followingId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const follow = await ctx.db
      .query("follows")
      .withIndex("by_follower_following", (q) =>
        q.eq("followerId", args.followerId).eq("followingId", args.followingId)
      )
      .first();

    return follow !== null;
  },
});

// Get follower count for a user
export const getFollowerCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", args.userId))
      .collect();

    return followers.length;
  },
});

// Get following count for a user
export const getFollowingCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();

    return following.length;
  },
});

// Get list of followers for a user
export const getFollowers = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", args.userId))
      .collect();

    const followers = await Promise.all(
      follows.map(async (follow) => {
        return await ctx.db.get(follow.followerId);
      })
    );

    return followers.filter((user) => user !== null);
  },
});

// Get list of users that a user is following
export const getFollowing = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();

    const following = await Promise.all(
      follows.map(async (follow) => {
        return await ctx.db.get(follow.followingId);
      })
    );

    return following.filter((user) => user !== null);
  },
});

// Check if user is participating in an event
export const isParticipating = query({
  args: { userId: v.id("users"), postId: v.id("posts") },
  handler: async (ctx, args) => {
    const participation = await ctx.db
      .query("participants")
      .withIndex("by_user_post", (q) =>
        q.eq("userId", args.userId).eq("postId", args.postId)
      )
      .first();

    return participation !== null;
  },
});

// Get poll vote for a user
export const getPollVote = query({
  args: { userId: v.id("users"), postId: v.id("posts") },
  handler: async (ctx, args) => {
    const vote = await ctx.db
      .query("pollVotes")
      .withIndex("by_user_post", (q) =>
        q.eq("userId", args.userId).eq("postId", args.postId)
      )
      .first();

    return vote ? vote.optionIndex : null;
  },
});

// Get poll results (vote counts per option)
export const getPollResults = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post || post.postType !== "poll" || !post.pollOptions) {
      return null;
    }

    const votes = await ctx.db
      .query("pollVotes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    // Count votes per option
    const results = post.pollOptions.map((_, index) => {
      return votes.filter((vote) => vote.optionIndex === index).length;
    });

    return results;
  },
});

// Get participants list for an event
export const getParticipants = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    const participantsWithUsers = await Promise.all(
      participants.map(async (participant) => {
        const user = await ctx.db.get(participant.userId);
        if (!user) return null;

        // Convert storage ID to URL if it exists
        let imageUrl = user.image;
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = (await ctx.storage.getUrl(imageUrl as any)) ?? imageUrl;
        }

        return {
          _id: user._id,
          name: user.name,
          username: user.username,
          image: imageUrl,
          uni_name: user.uni_name,
          major: user.major,
          joinedAt: participant.joinedAt,
        };
      })
    );

    return participantsWithUsers.filter((p) => p !== null);
  },
});

// Get filtered feed by tags, major, interests, etc.
export const getFilteredFeed = query({
  args: {
    tags: v.optional(v.array(v.string())),
    major: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    postType: v.optional(v.union(
      v.literal("normal"),
      v.literal("spontaneous_meeting"),
      v.literal("recurring_meeting"),
      v.literal("announcement"),
      v.literal("poll")
    )),
    sortBy: v.optional(v.union(v.literal("newest"), v.literal("oldest"), v.literal("mostLikes"), v.literal("mostComments"))),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let posts = await ctx.db
      .query("posts")
      .withIndex("by_created")
      .order("desc")
      .collect();

    // Filter by post type
    if (args.postType) {
      posts = posts.filter((post) => post.postType === args.postType);
    }

    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      posts = posts.filter((post) => {
        if (!post.tags || post.tags.length === 0) return false;
        return args.tags!.some((tag) => post.tags!.includes(tag));
      });
    }

    // Batch-Abfrage aller Likes für diesen User
    let userLikesMap: Record<string, boolean> = {};
    if (args.userId) {
      const postIds = posts.map((p) => p._id);
      const allLikes = await ctx.db
        .query("likes")
        .collect();
      
      const userLikes = allLikes.filter(
        (like) => like.userId === args.userId && postIds.includes(like.postId)
      );
      
      userLikes.forEach((like) => {
        userLikesMap[like.postId as string] = true;
      });
    }

    // Get posts with user info and apply major filter
    const postsWithUsers = await Promise.all(
      posts.map(async (post) => {
        const user = await ctx.db.get(post.userId);

        // Filter by major if specified
        if (args.major && user?.major !== args.major) {
          return null;
        }

        // Filter by interests if specified
        // User must have at least one matching interest
        if (args.interests && args.interests.length > 0) {
          const userInterests = (user as any)?.interests || [];
          const hasMatchingInterest = args.interests.some(interest => userInterests.includes(interest));
          if (!hasMatchingInterest) {
            return null;
          }
        }

        let imageUrl = post.imageUrl;
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = (await ctx.storage.getUrl(imageUrl as any)) ?? imageUrl;
        }

        let userImageUrl = user?.image;
        if (userImageUrl && !userImageUrl.startsWith('http')) {
          userImageUrl = (await ctx.storage.getUrl(userImageUrl as any)) ?? userImageUrl;
        }

        // Calculate actual participants count for events
        let actualParticipantsCount = post.participantsCount || 0;
        if (post.postType === "spontaneous_meeting" || post.postType === "recurring_meeting") {
          const participants = await ctx.db
            .query("participants")
            .withIndex("by_post", (q) => q.eq("postId", post._id))
            .collect();
          actualParticipantsCount = participants.length;
        }

        // Calculate actual comments count (only top-level comments)
        const actualCommentsCount = await calculateCommentsCount(ctx, post._id);

        return {
          ...post,
          participantsCount: actualParticipantsCount,
          commentsCount: actualCommentsCount,
          imageUrl,
          isLiked: args.userId ? (userLikesMap[post._id as string] ?? false) : undefined,
          user: user ? {
            ...user,
            image: userImageUrl,
          } : null,
        };
      })
    );

    let filteredPosts = postsWithUsers.filter((post) => post !== null);

    // Apply sorting
    if (args.sortBy) {
      switch (args.sortBy) {
        case "newest":
          filteredPosts.sort((a, b) => b.createdAt - a.createdAt);
          break;
        case "oldest":
          filteredPosts.sort((a, b) => a.createdAt - b.createdAt);
          break;
        case "mostLikes":
          filteredPosts.sort((a, b) => b.likesCount - a.likesCount);
          break;
        case "mostComments":
          filteredPosts.sort((a, b) => b.commentsCount - a.commentsCount);
          break;
        default:
          // Default to newest (desc order)
          filteredPosts.sort((a, b) => b.createdAt - a.createdAt);
      }
    } else {
      // Default to newest if no sort specified
      filteredPosts.sort((a, b) => b.createdAt - a.createdAt);
    }

    return filteredPosts;
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    // Fix image URLs for all users
    const usersWithImages = await Promise.all(
      users.map(async (user) => {
        let imageUrl = user.image;
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = (await ctx.storage.getUrl(imageUrl as any)) ?? imageUrl;
        }
        return {
          ...user,
          image: imageUrl
        };
      })
    );

    return usersWithImages;
  },
});

export const getConversations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // 1. Alle Conversations holen, an denen der User beteiligt ist
    // Hinweis: In Convex ist das Filtern von Arrays etwas komplexer.
    // Wir holen "alle" und filtern im Code, oder besser: Wir nutzen einen Index wenn möglich.
    // Mit dem Index "by_participant" können wir das leider nicht direkt effizient abfragen, 
    // da es ein Array ist. Für V1 iterieren wir über alle Conversations und filtern.
    // (Besser wäre eine separate Relationstabelle UserConversation, aber schema.ts ist schon definiert)

    const conversations = await ctx.db.query("conversations").collect();

    const relevantConversations = conversations.filter(c =>
      c.participants.includes(args.userId) || c.leftParticipants?.includes(args.userId)
    );

    // 2. Details für die Conversations anreichern
    const enrichedConversations = await Promise.all(
      relevantConversations.map(async (conv) => {
        // Membership status
        const isLeft = conv.leftParticipants?.includes(args.userId) || false;
        const membership = isLeft ? "left" : "active";
        // Unread Count Logic
        const lastRead = await ctx.db
          .query("last_reads")
          .withIndex("by_user_conversation", (q) =>
            q.eq("userId", args.userId).eq("conversationId", conv._id)
          )
          .first();

        const lastReadAt = lastRead?.lastReadAt || 0;

        // Count messages since last read
        const unreadMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversation_created", (q) =>
            q.eq("conversationId", conv._id).gt("createdAt", lastReadAt)
          )
          .collect();

        // Don't count own messages as unread
        const unreadCount = unreadMessages.filter(m => {
          // Check if message is after user left
          if (isLeft) {
            let leftAt = Infinity;
            if (conv.leftMetadata) {
              const userMeta = conv.leftMetadata.find(m => m.userId === args.userId);
              if (userMeta) {
                leftAt = userMeta.leftAt;
              }
            }
            if (m.createdAt > leftAt) return false;
          }

          if (m.senderId === args.userId) return false;
          if (m.type === "system") return false;
          if (m.visibleTo && !m.visibleTo.includes(args.userId)) return false;
          return true;
        }).length;

        // Bestimme Name und Bild für die Anzeige
        let displayName = "Unbekannt";
        let displayImage = undefined;

        if (conv.isGroup) {
          displayName = conv.name || "Gruppenchat";
          if (conv.image) {
            displayImage = await ctx.storage.getUrl(conv.image as any);
          }
        } else {
          // 1:1 Chat: Partner Info anzeigen
          const partnerId = conv.participants.find((id) => id !== args.userId) || args.userId;
          const partner = await ctx.db.get(partnerId);
          if (partner) {
            displayName = partner.name;
            let partnerImageUrl = partner.image;
            if (partnerImageUrl && !partnerImageUrl.startsWith('http')) {
              partnerImageUrl = (await ctx.storage.getUrl(partnerImageUrl as any)) ?? partnerImageUrl;
            }
            displayImage = partnerImageUrl;
          }
        }

        let lastMessage = null;
        if (conv.lastMessageId) {
          lastMessage = await ctx.db.get(conv.lastMessageId);
        }

        // Context-aware last message for left users
        if (isLeft && lastMessage) {
          let leftAt = Infinity;
          if (conv.leftMetadata) {
            const userMeta = conv.leftMetadata.find(m => m.userId === args.userId);
            if (userMeta) {
              leftAt = userMeta.leftAt;
            }
          }

          // If the current global last message is newer than when they left, find the correct one
          if (lastMessage.createdAt > leftAt) {
            lastMessage = await ctx.db
              .query("messages")
              .withIndex("by_conversation_created", (q) =>
                q.eq("conversationId", conv._id).lte("createdAt", leftAt)
              )
              .order("desc")
              .first();
          }
        }

        return {
          ...conv,
          displayName,
          displayImage,
          lastMessage,
          unreadCount,
          membership,
        };
      })
    );

    return enrichedConversations.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getUnreadCounts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const conversations = await ctx.db.query("conversations").collect();
    const relevantConversations = conversations.filter(c =>
      c.participants.includes(args.userId)
    );

    let totalUnread = 0;

    await Promise.all(
      relevantConversations.map(async (conv) => {
        const lastRead = await ctx.db
          .query("last_reads")
          .withIndex("by_user_conversation", (q) =>
            q.eq("userId", args.userId).eq("conversationId", conv._id)
          )
          .first();

        const lastReadAt = lastRead?.lastReadAt || 0;

        const unreadMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversation_created", (q) =>
            q.eq("conversationId", conv._id).gt("createdAt", lastReadAt)
          )
          .collect();

        // Filter messages
        const count = unreadMessages.filter(m => {
          // 1. Own messages are read
          if (m.senderId === args.userId) return false;

          // 2. System messages don't count
          if (m.type === "system") return false;

          // 3. Check visibility
          if (m.visibleTo && !m.visibleTo.includes(args.userId)) return false;

          return true;
        }).length;
        totalUnread += count;
      })
    );

    return { totalUnread };
  },
});

export const getConversationMembers = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return [];

    const allParticipantIds = [
      ...conversation.participants,
      ...(conversation.leftParticipants || [])
    ];
    // Unique IDs
    const uniqueIds = Array.from(new Set(allParticipantIds));

    const members = await Promise.all(
      uniqueIds.map(async (userId) => {
        const user = await ctx.db.get(userId);
        if (!user) return null;

        let imageUrl = user.image;
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = (await ctx.storage.getUrl(imageUrl as any)) ?? imageUrl;
        }

        const userIdString = userId.toString();
        const creatorIdString = conversation.creatorId?.toString();
        const adminIdsStrings = conversation.adminIds?.map(id => id.toString()) || [];
        const leftParticipantsStrings = conversation.leftParticipants?.map(id => id.toString()) || [];

        return {
          ...user,
          image: imageUrl,
          role: creatorIdString === userIdString ? "creator" :
            adminIdsStrings.includes(userIdString) ? "admin" :
              leftParticipantsStrings.includes(userIdString) ? "left" : "member",
        };
      })
    );

    return members.filter((m) => m !== null);
  },
});

export const getComments = query({
  args: {
    postId: v.id("posts"),
    userId: v.optional(v.id("users")), // Für Like-Status
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post_created", (q) => q.eq("postId", args.postId))
      .order("asc")
      .collect();

    // Batch-Abfrage aller Likes für diesen User
    let userCommentLikesMap: Record<string, boolean> = {};
    let userCommentDislikesMap: Record<string, boolean> = {};
    if (args.userId) {
      const commentIds = comments.map((c) => c._id);
      const allCommentLikes = await ctx.db
        .query("commentLikes")
        .collect();
      
      const userCommentLikes = allCommentLikes.filter(
        (like) => like.userId === args.userId && commentIds.includes(like.commentId)
      );
      
      userCommentLikes.forEach((like) => {
        userCommentLikesMap[like.commentId as string] = true;
      });

      // Batch-Abfrage aller Dislikes für diesen User
      const allCommentDislikes = await ctx.db
        .query("commentDislikes")
        .collect();
      
      const userCommentDislikes = allCommentDislikes.filter(
        (dislike) => dislike.userId === args.userId && commentIds.includes(dislike.commentId)
      );
      
      userCommentDislikes.forEach((dislike) => {
        userCommentDislikesMap[dislike.commentId as string] = true;
      });
    }

    const commentsWithUsers = await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId);
        if (!user) return null;

        let imageUrl = user.image;
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = (await ctx.storage.getUrl(imageUrl as any)) ?? imageUrl;
        }

        // Convert comment image storage ID to URL if it exists
        let commentImageUrl = comment.imageUrl;
        if (commentImageUrl && !commentImageUrl.startsWith('http')) {
          commentImageUrl = (await ctx.storage.getUrl(commentImageUrl as any)) ?? commentImageUrl;
        }

        return {
          _id: comment._id,
          userId: comment.userId,
          postId: comment.postId,
          parentCommentId: comment.parentCommentId,
          content: comment.content,
          imageUrl: commentImageUrl,
          likesCount: comment.likesCount,
          repliesCount: comment.repliesCount,
          createdAt: comment.createdAt,
          isLiked: args.userId ? (userCommentLikesMap[comment._id as string] ?? false) : false,
          isDisliked: args.userId ? (userCommentDislikesMap[comment._id as string] ?? false) : false,
          user: {
            _id: user._id,
            name: user.name,
            username: user.username,
            image: imageUrl,
          },
        };
      })
    );

    // Filter out null comments (but keep disliked comments - they will be shown with a message)
    const filteredComments = commentsWithUsers
      .filter((c): c is NonNullable<typeof c> => c !== null);

    return filteredComments;
  },
});

export const getConversationFiles = query({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users") // active user checking files
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return [];

    // Check access: participant OR leftParticipant
    const isParticipant = conversation.participants.includes(args.userId);
    const isLeft = conversation.leftParticipants?.includes(args.userId);

    if (!isParticipant && !isLeft) {
      return []; // No access
    }

    // Determine cutoff time for left users
    let leftAt = Infinity;
    if (isLeft && !isParticipant) {
      // If they are NOT in current participants but ARE in leftParticipants
      if (conversation.leftMetadata) {
        const userMeta = conversation.leftMetadata.find(m => m.userId === args.userId);
        if (userMeta) {
          leftAt = userMeta.leftAt;
        }
      }
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_created", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc") // Newest first
      .take(200);

    const visibleMessages = messages.filter(m => m.createdAt <= leftAt);

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    const files: any[] = [];

    for (const m of visibleMessages) {
      if (m.type === "image" || m.type === "pdf") {
        let url = null;
        if (m.storageId) {
          url = await ctx.storage.getUrl(m.storageId);
        }
        files.push({
          ...m,
          url
        });
      } else if (!m.type || m.type === "text") {
        // Search for links in text messages
        const content = m.content;
        const matches = content.match(urlRegex);
        if (matches) {
          matches.forEach((matchedUrl, index) => {
            files.push({
              _id: `${m._id}_link_${index}`, // Unique virtual ID
              conversationId: m.conversationId,
              senderId: m.senderId,
              content: matchedUrl,
              type: "link",
              url: matchedUrl,
              createdAt: m.createdAt,
            });
          });
        }
      }
    }

    return files;
  }
});

export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
    activeUserId: v.optional(v.id("users")) // Passed from client because auth is via NextAuth
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_created", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .collect();

    // Filter messages based on visibility & resolve URLs
    const currentUserId = args.activeUserId;

    // Check if user has left the group and get timestamp
    let leftAt = Infinity;
    if (currentUserId) {
      const conversation = await ctx.db.get(args.conversationId);
      if (conversation && conversation.leftMetadata) {
        const userMeta = conversation.leftMetadata.find(m => m.userId === currentUserId);
        if (userMeta) {
          leftAt = userMeta.leftAt;
        } else if (conversation.leftParticipants?.includes(currentUserId)) {
          // Fallback for legacy data (before metadata): user left but no timestamp known.
          // We could fetch ALL or NONE. Let's assume full history for kindness, but stop new ones?
          // Actually, if we want to restrict "future" messages, and we don't know when they left,
          // we can't reliably filter. 
          // However, the requirement is "messages sent AFTER... should not be received".
          // If no timestamp, we can't enforce this for old exits, but new ones will have it.
        }
      }
    }

    const visibleMessages = messages.filter(msg => {
      // 1. Time-based access control for left members
      if (msg.createdAt > leftAt) return false;

      if (!msg.visibleTo) return true; // Public message
      if (!currentUserId) return false; // Private message but no user logged in
      return msg.visibleTo.includes(currentUserId);
    });

    // Resolve URLs for files
    const messagesWithUrls = await Promise.all(
      visibleMessages.map(async (msg) => {
        let url = null;
        if (msg.storageId) {
          url = await ctx.storage.getUrl(msg.storageId);
        }
        return {
          ...msg,
          url
        };
      })
    );

    return messagesWithUrls;

  },
});
