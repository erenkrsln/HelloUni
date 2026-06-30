import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getImageUrl, getUserImageUrl, getGroupImageUrl } from "./helpers";

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
        imageUrl = await getImageUrl(ctx, imageUrl);
        const userImageUrl = await getUserImageUrl(ctx, user?.image);

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
  args: {
    postId: v.id("posts"),
    userId: v.optional(v.id("users"))
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return null;

    const user = await ctx.db.get(post.userId);

    // Convert storage ID to URL if it exists
    let imageUrl = post.imageUrl;
    imageUrl = await getImageUrl(ctx, imageUrl);
    const userImageUrl = await getUserImageUrl(ctx, user?.image);

    // Calculate actual participants count for events
    let actualParticipantsCount = post.participantsCount || 0;
    if (post.postType === "spontaneous_meeting" || post.postType === "recurring_meeting") {
      const participants = await ctx.db
        .query("participants")
        .withIndex("by_post", (q) => q.eq("postId", post._id))
        .collect();
      actualParticipantsCount = participants.length;
    }

    // Calculate actual comments count
    const actualCommentsCount = await calculateCommentsCount(ctx, post._id);

    // Check if liked
    let isLiked = false;
    if (args.userId) {
      const like = await ctx.db
        .query("likes")
        .withIndex("by_user_post", (q) =>
          q.eq("userId", args.userId!).eq("postId", args.postId)
        )
        .first();
      isLiked = !!like;
    }

    // Check if joined (for events)
    let hasJoined = false;
    if (args.userId && (post.postType === "spontaneous_meeting" || post.postType === "recurring_meeting")) {
      const participation = await ctx.db
        .query("participants")
        .withIndex("by_user_post", (q) =>
          q.eq("userId", args.userId!).eq("postId", args.postId)
        )
        .first();
      hasJoined = !!participation;
    }

    return {
      ...post,
      participantsCount: actualParticipantsCount,
      commentsCount: actualCommentsCount,
      imageUrl,
      hasLiked: isLiked, // Use hasLiked to match FeedCard expectation (though getFeed uses isLiked, we map it)
      hasJoined,
      user: user ? {
        ...user,
        image: userImageUrl ?? undefined,
        username: user.username, // Ensure username is available
        major: user.major,
        semester: user.semester,
      } : null,
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

    const imageUrl = await getUserImageUrl(ctx, user.image);
    const headerImageUrl = await getImageUrl(ctx, user.headerImage);

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
        imageUrl = await getImageUrl(ctx, imageUrl);
        const userImageUrl = await getUserImageUrl(ctx, user?.image);

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

    const imageUrl = await getUserImageUrl(ctx, user.image);
    const headerImageUrl = await getImageUrl(ctx, user.headerImage);

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
        const imageUrl = await getUserImageUrl(ctx, user.image);
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

    const imageUrl = await getUserImageUrl(ctx, user.image);
    const headerImageUrl = await getImageUrl(ctx, user.headerImage);

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
        imageUrl = await getImageUrl(ctx, imageUrl);
        const userImageUrl = await getUserImageUrl(ctx, user?.image);

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
  args: {
    userId: v.id("users"),
    currentUserId: v.optional(v.id("users")),
  },
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

    const activeFollowers = followers.filter((user) => user !== null);

    // Get the list of users the current user is following
    const myFollowing = new Set<string>();
    if (args.currentUserId) {
      const myFollows = await ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerId", args.currentUserId!))
        .collect();
      myFollows.forEach((f) => myFollowing.add(f.followingId));
    }

    return await Promise.all(
      activeFollowers.map(async (user) => {
        const image = await getUserImageUrl(ctx, user.image);
        return {
          ...user,
          image,
          isFollowing: args.currentUserId ? myFollowing.has(user._id) : false,
        };
      })
    );
  },
});

// Get list of users that a user is following
export const getFollowing = query({
  args: {
    userId: v.id("users"),
    currentUserId: v.optional(v.id("users")),
  },
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

    const activeFollowing = following.filter((user) => user !== null);

    // Get the list of users the current user is following
    const myFollowing = new Set<string>();
    if (args.currentUserId) {
      const myFollows = await ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerId", args.currentUserId!))
        .collect();
      myFollows.forEach((f) => myFollowing.add(f.followingId));
    }

    return await Promise.all(
      activeFollowing.map(async (user) => {
        const image = await getUserImageUrl(ctx, user.image);
        return {
          ...user,
          image,
          isFollowing: args.currentUserId ? myFollowing.has(user._id) : false,
        };
      })
    );
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
        const imageUrl = await getUserImageUrl(ctx, user.image);

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
        imageUrl = await getImageUrl(ctx, imageUrl);
        const userImageUrl = await getUserImageUrl(ctx, user?.image);

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
        const imageUrl = await getUserImageUrl(ctx, user.image);
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
      (c.participants.includes(args.userId) || c.leftParticipants?.includes(args.userId)) &&
      !(c.deletedBy?.includes(args.userId))
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
          displayImage = await getGroupImageUrl(ctx, conv.image);
        } else {
          // 1:1 Chat: Partner Info anzeigen
          const partnerId = conv.participants.find((id) => id !== args.userId) || args.userId;
          const partner = await ctx.db.get(partnerId);
          if (partner) {
            displayName = partner.name;
            displayImage = await getUserImageUrl(ctx, partner.image);
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
      c.participants.includes(args.userId) &&
      !(c.deletedBy?.includes(args.userId))
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

/** Name + Bild einer Conversation (für Gruppenanruf-UI). */
export const getConversationDisplay = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) return null;

    if (!conv.isGroup) return null;

    return {
      displayName: conv.name || "Gruppenchat",
      displayImage: await getGroupImageUrl(ctx, conv.image),
    };
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

        const imageUrl = await getUserImageUrl(ctx, user.image);

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

        const imageUrl = await getUserImageUrl(ctx, user.image);

        const commentImageUrl = await getImageUrl(ctx, comment.imageUrl);

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
      if (m.type === "image" || m.type === "pdf" || m.type === "video") {
        const url = await getImageUrl(ctx, m.storageId);
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
      visibleMessages.map(async (msg) => ({
        ...msg,
        url: await getImageUrl(ctx, msg.storageId),
      }))
    );

    return messagesWithUrls;

  },
});

// Global Search Query
export const searchGlobal = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    if (!args.query || args.query.length < 1) {
      return { users: [], posts: [] };
    }

    const searchLower = args.query.toLowerCase();

    // 1. Search Users
    const allUsers = await ctx.db
      .query("users")
      .collect();

    const matchingUsers = await Promise.all(
      allUsers
        .filter(user => (
          (user.name && user.name.toLowerCase().includes(searchLower)) ||
          (user.username && user.username.toLowerCase().includes(searchLower))
        ))
        // Limit user results
        .slice(0, 20)
        .map(async (user) => ({
          ...user,
          image: await getUserImageUrl(ctx, user.image),
        }))
    );

    // 2. Search Posts
    const allPosts = await ctx.db
      .query("posts")
      .withIndex("by_created")
      .order("desc")
      .collect();

    const matchingPosts = await Promise.all(
      allPosts
        .filter(post => (
          (post.title && post.title.toLowerCase().includes(searchLower)) ||
          (post.content && post.content.toLowerCase().includes(searchLower))
        ))
        // Limit post results
        .slice(0, 20)
        .map(async (post) => {
          const user = await ctx.db.get(post.userId);

          const imageUrl = await getImageUrl(ctx, post.imageUrl);
          const userImageUrl = await getUserImageUrl(ctx, user?.image);

          // Calculate actual comments count
          const actualCommentsCount = await calculateCommentsCount(ctx, post._id);

          return {
            ...post,
            imageUrl,
            commentsCount: actualCommentsCount,
            user: user ? {
              ...user,
              image: userImageUrl,
            } : null,
          };
        })
    );

    return {
      users: matchingUsers,
      posts: matchingPosts.filter(p => p.user !== null) // Ensure posts have valid users
    };
  },
});

// Search all users by name or username
// Search all users by name or username
export const searchProfiles = query({
  args: {
    searchTerm: v.string(),
    sortBy: v.optional(v.string()),
    major: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    currentUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const hasFilters = args.major || (args.interests && args.interests.length > 0);
    if ((!args.searchTerm || args.searchTerm.trim().length === 0) && !hasFilters) {
      return [];
    }

    // Link all users
    const allUsers = await ctx.db
      .query("users")
      .collect();

    // Filter users by name or username (case-insensitive)
    let matchingUsers = allUsers;
    if (args.searchTerm && args.searchTerm.trim().length > 0) {
      const searchLow = args.searchTerm.toLowerCase().trim();
      matchingUsers = matchingUsers.filter(user =>
        (user.name && user.name.toLowerCase().includes(searchLow)) ||
        (user.username && user.username.toLowerCase().includes(searchLow))
      );
    }

    // Filter by major if provided
    if (args.major) {
      matchingUsers = matchingUsers.filter(user => user.major === args.major);
    }

    // Filter by interests if provided (check if user has at least one matching interest)
    if (args.interests && args.interests.length > 0) {
      matchingUsers = matchingUsers.filter(user => {
        const userInterests = user.interests || [];
        return args.interests!.some(interest => userInterests.includes(interest));
      });
    }

    // Apply sorting
    if (args.sortBy === "alphabetical") {
      matchingUsers.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (args.sortBy === "recent") {
      // Use _creationTime as a proxy for recency if createdAt is missing
      matchingUsers.sort((a, b) => (b._creationTime || 0) - (a._creationTime || 0));
    }

    // Limit to 20 results after sorting and filtering
    const limitedUsers = matchingUsers.slice(0, 20);

    // Get follows if currentUserId is provided
    const followedUserIds = new Set<string>();
    if (args.currentUserId) {
      const follows = await ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerId", args.currentUserId!))
        .collect();
      follows.forEach((f) => followedUserIds.add(f.followingId));
    }

    // Convert storage IDs to URLs
    const usersWithImages = await Promise.all(
      limitedUsers.map(async (user) => {
        const imageUrl = await getUserImageUrl(ctx, user.image);
        return {
          ...user,
          image: imageUrl,
          isFollowing: args.currentUserId ? followedUserIds.has(user._id) : false,
        };
      })
    );

    return usersWithImages;
  },
});

// Get recommended compatible users for the current user
export const getCompatibleUsers = query({
  args: {
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    // If no user is logged in, return the top `limit` most recently joined people
    if (!args.userId) {
      const allUsers = await ctx.db
        .query("users")
        .collect();
      
      const sorted = allUsers.sort((a, b) => (b._creationTime || 0) - (a._creationTime || 0));
      const topN = sorted.slice(0, limit);
      
      return await Promise.all(
        topN.map(async (user) => {
          const image = await getUserImageUrl(ctx, user.image);
          return { ...user, image, isFollowing: false };
        })
      );
    }

    const currentUser = await ctx.db.get(args.userId);
    if (!currentUser) {
      return [];
    }

    // Get the list of users the current user is already following
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId!))
      .collect();
    const followedUserIds = new Set(follows.map((f) => f.followingId));

    // Get all users
    const allUsers = await ctx.db
      .query("users")
      .collect();

    // Filter out current user and already followed users
    const potentialUsers = allUsers.filter(
      (u) => u._id !== args.userId && !followedUserIds.has(u._id)
    );

    // Score users based on compatibility matching
    const scoredUsers = potentialUsers.map((user) => {
      let score = 0;

      // 1. Major match (case-insensitive)
      if (
        user.major &&
        currentUser.major &&
        user.major.toLowerCase().trim() === currentUser.major.toLowerCase().trim()
      ) {
        score += 1;
      }

      // 2. Semester match
      if (
        user.semester !== undefined &&
        currentUser.semester !== undefined &&
        user.semester === currentUser.semester
      ) {
        score += 1;
      }

      // 3. Interests match (share at least one interest)
      if (
        user.interests &&
        currentUser.interests &&
        Array.isArray(user.interests) &&
        Array.isArray(currentUser.interests)
      ) {
        const currentUserInterestsLower = currentUser.interests.map(i => i.toLowerCase().trim());
        const userInterestsLower = user.interests.map(i => i.toLowerCase().trim());
        const hasCommonInterest = currentUserInterestsLower.some(i => userInterestsLower.includes(i));
        if (hasCommonInterest) {
          score += 1;
        }
      }

      return { user, score };
    });

    // Only keep users that match in at least one category (score >= 1)
    const matchedUsers = scoredUsers.filter((item) => item.score >= 1);

    // Prioritize more matches higher, then more recently joined (creation time desc)
    matchedUsers.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (b.user._creationTime || 0) - (a.user._creationTime || 0);
    });

    let selectedUsers = matchedUsers.slice(0, limit).map((item) => item.user);

    // If there are less than limit compatible users, fill the rest with the most recently joined people
    if (selectedUsers.length < limit) {
      const selectedUserIds = new Set(selectedUsers.map((u) => u._id));
      const otherUsers = potentialUsers.filter((u) => !selectedUserIds.has(u._id));
      
      // Sort other users by recency (creation time desc)
      const sortedRecentOthers = otherUsers.sort(
        (a, b) => (b._creationTime || 0) - (a._creationTime || 0)
      );
      
      const neededCount = limit - selectedUsers.length;
      const paddingUsers = sortedRecentOthers.slice(0, neededCount);
      selectedUsers = [...selectedUsers, ...paddingUsers];
    }

    // Resolve storage IDs to URLs
    return await Promise.all(
      selectedUsers.map(async (user) => {
        const image = await getUserImageUrl(ctx, user.image);
        return { ...user, image, isFollowing: false };
      })
    );
  },
});


// Search all posts by title or content
// Search all posts by title or content
export const searchPosts = query({
  args: {
    searchTerm: v.string(),
    userId: v.optional(v.id("users")),
    sortBy: v.optional(v.string()),
    postType: v.optional(v.string()),
    major: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const hasFilters = args.postType || args.major;
    if ((!args.searchTerm || args.searchTerm.trim().length === 0) && !hasFilters) {
      return [];
    }

    const allPosts = await ctx.db
      .query("posts")
      .withIndex("by_created") // Use by_created as base
      .order("desc") // Initial fetch order
      .collect();

    // Filter posts by title or content (case-insensitive)
    let matchingPosts = allPosts;
    if (args.searchTerm && args.searchTerm.trim().length > 0) {
      const searchLow = args.searchTerm.toLowerCase().trim();
      matchingPosts = matchingPosts.filter(post =>
        (post.title && post.title.toLowerCase().includes(searchLow)) ||
        (post.content && post.content.toLowerCase().includes(searchLow))
      );
    }

    // Filter by postType
    if (args.postType) {
      matchingPosts = matchingPosts.filter(post => post.postType === args.postType);
    }

    // Apply sorting
    if (args.sortBy === "alphabetical") {
      matchingPosts.sort((a, b) => {
        const titleA = a.title || a.content || "";
        const titleB = b.title || b.content || "";
        return titleA.localeCompare(titleB);
      });
    } else if (args.sortBy === "recent" || !args.sortBy) {
      // Already sorted by 'desc' from query, but good to ensure if logic changes
      matchingPosts.sort((a, b) => b.createdAt - a.createdAt);
    }

    // Limit to 20 results (can increase if needed)
    // We filter by major AFTER fetching user data, so let's take more initially or fetch users for all matches first
    // Optimization: Fetch users for all matching posts first, then filter, then pagination slice
    // For simplicity now: Fetch users for matching posts, filter by major, then slice.
    const matchesCount = matchingPosts.length;
    // const limitedPosts = matchingPosts.slice(0, 20); // DON'T SLICE YET if filtering by major

    // Batch-Abfrage aller Likes fÃ¼r diesen User (Reuse logic from getFeed/getFilteredFeed)
    let userLikesMap: Record<string, boolean> = {};
    if (args.userId) {
      const postIds = matchingPosts.map((p) => p._id);
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
      matchingPosts.map(async (post) => {
        const user = await ctx.db.get(post.userId);

        // Filter by Author's Major if provided
        if (args.major && user?.major !== args.major) {
          return null;
        }

        const imageUrl = await getImageUrl(ctx, post.imageUrl);
        const userImageUrl = await getUserImageUrl(ctx, user?.image);

        let actualParticipantsCount = post.participantsCount || 0;
        if (post.postType === "spontaneous_meeting" || post.postType === "recurring_meeting") {
          const participants = await ctx.db
            .query("participants")
            .withIndex("by_post", (q) => q.eq("postId", post._id))
            .collect();
          actualParticipantsCount = participants.length;
        }

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

    // Filter out nulls (posts that failed major filter) and then apply limit
    const finalResults = postsWithUsers.filter(p => p !== null).slice(0, 20);

    return finalResults;
  },
});

// Get chat poll data by ID
export const getChatPoll = query({
  args: { chatPollId: v.id("chatPolls") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chatPollId);
  },
});

// Get vote counts per option for a chat poll
export const getChatPollResults = query({
  args: { chatPollId: v.id("chatPolls") },
  handler: async (ctx, args) => {
    const poll = await ctx.db.get(args.chatPollId);
    if (!poll) return null;

    const votes = await ctx.db
      .query("chatPollVotes")
      .withIndex("by_poll", (q) => q.eq("chatPollId", args.chatPollId))
      .collect();

    // Count votes per option index
    const results = poll.options.map((_, index) =>
      votes.reduce((count, vote) =>
        vote.optionIndices.includes(index) ? count + 1 : count, 0)
    );

    return { results, totalVoters: votes.length };
  },
});

// Get current user's vote for a chat poll (returns array of chosen indices)
export const getChatPollVote = query({
  args: { chatPollId: v.id("chatPolls"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const vote = await ctx.db
      .query("chatPollVotes")
      .withIndex("by_poll_user", (q) =>
        q.eq("chatPollId", args.chatPollId).eq("userId", args.userId)
      )
      .first();

    return vote ? vote.optionIndices : [];
  },
});

export const getActiveLiveLocation = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    // Handle static location messages
    if (message.type === "location") {
      return {
        isLiveActive: false,
        latitude: message.latitude,
        longitude: message.longitude,
        address: message.address,
        updatedAt: message.createdAt,
        liveExpiresAt: undefined,
      };
    }

    if (message.type !== "live_location") return null;

    // Check if expired
    const isExpired = message.liveExpiresAt ? Date.now() > message.liveExpiresAt : false;
    const isLiveActive = message.isLiveActive && !isExpired;

    if (!isLiveActive) {
      return {
        isLiveActive: false,
        latitude: message.latitude,
        longitude: message.longitude,
        address: message.address,
        updatedAt: message.createdAt,
        liveExpiresAt: message.liveExpiresAt,
      };
    }

    const liveLoc = await ctx.db
      .query("liveLocations")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .first();

    return {
      isLiveActive: true,
      latitude: liveLoc ? liveLoc.latitude : message.latitude,
      longitude: liveLoc ? liveLoc.longitude : message.longitude,
      address: message.address,
      updatedAt: liveLoc ? liveLoc.updatedAt : message.createdAt,
      liveExpiresAt: message.liveExpiresAt,
    };
  },
});

// ─── Cache-Queries ────────────────────────────────────────────────────────────

export const getStudiengangCache = query({
  args: { major: v.string() },
  handler: async (ctx, { major }) => {
    return ctx.db
      .query("studiengangCache")
      .withIndex("by_major", (q) => q.eq("major", major))
      .first();
  },
});

export const getMensaCache = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("mensaCache").first();
  },
});

export const searchPublicGroups = query({
  args: {
    searchTerm: v.string(),
    sortBy: v.union(v.literal("recent"), v.literal("alphabetical")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const conversations = await ctx.db.query("conversations").collect();

    let publicGroups = conversations.filter(
      (c) => c.isGroup === true && c.isPublic === true
    );

    // Filter by search term
    if (args.searchTerm.trim() !== "") {
      const term = args.searchTerm.toLowerCase();
      publicGroups = publicGroups.filter(
        (c) => c.name && c.name.toLowerCase().includes(term)
      );
    }

    // Map user's join requests
    const userRequestsMap: Record<string, string> = {};
    if (args.userId) {
      const requests = await ctx.db
        .query("joinRequests")
        .withIndex("by_user", (q) => q.eq("userId", args.userId!))
        .collect();
      requests.forEach((r) => {
        userRequestsMap[r.conversationId as string] = r.status;
      });
    }

    // Enrich public groups with images
    const enrichedGroups = await Promise.all(
      publicGroups.map(async (group) => {
        const displayImage = await getGroupImageUrl(ctx, group.image);
        return {
          ...group,
          displayName: group.name || "Öffentliche Gruppe",
          displayImage,
          needsRequestToJoin: group.needsRequestToJoin ?? true, // Default to true!
          joinRequestStatus: userRequestsMap[group._id as string] || null,
        };
      })
    );

    // Sort groups
    if (args.sortBy === "alphabetical") {
      enrichedGroups.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } else {
      enrichedGroups.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    return enrichedGroups;
  },
});

export const getChatSuggestions = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Get the list of users the current user is following
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();
    const followedUserIds = follows.map((f) => f.followingId);

    // 2. Get all conversations to find who the user has started a direct chat with
    const conversations = await ctx.db.query("conversations").collect();
    const directChatPartners = new Set<string>();
    
    for (const conv of conversations) {
      if (!conv.isGroup && conv.participants.includes(args.userId) && conv.participants.length === 2) {
        const partner = conv.participants.find((p) => p !== args.userId);
        if (partner) {
          directChatPartners.add(partner.toString());
        }
      }
    }

    // 3. Find followed users (even if they already have a chat together)
    const targetFollowedIds = followedUserIds.filter(
      (id) => id !== args.userId
    );

    let suggestions: any[] = [];
    if (targetFollowedIds.length > 0) {
      // Get the profiles of these followed users
      const users = await Promise.all(targetFollowedIds.map((id) => ctx.db.get(id)));
      const validUsers = users.filter((u): u is NonNullable<typeof u> => u !== null);
      
      suggestions = await Promise.all(
        validUsers.map(async (user) => {
          const image = await getUserImageUrl(ctx, user.image);
          return { ...user, image };
        })
      );
    }

    // 4. If we have fewer than 5 suggestions, pad with other recommended users
    if (suggestions.length < 5) {
      const currentUser = await ctx.db.get(args.userId);
      if (currentUser) {
        const followedUserIdsSet = new Set(followedUserIds.map(id => id.toString()));
        const allUsers = await ctx.db.query("users").collect();

        // Filter out current user, already followed users, and users who already have a direct chat
        const potentialUsers = allUsers.filter(
          (u) => u._id !== args.userId && 
                 !followedUserIdsSet.has(u._id.toString()) && 
                 !directChatPartners.has(u._id.toString())
        );

        // Score users
        const scoredUsers = potentialUsers.map((user) => {
          let score = 0;
          if (
            user.major &&
            currentUser.major &&
            user.major.toLowerCase().trim() === currentUser.major.toLowerCase().trim()
          ) {
            score += 1;
          }
          if (
            user.semester !== undefined &&
            currentUser.semester !== undefined &&
            user.semester === currentUser.semester
          ) {
            score += 1;
          }
          if (
            user.interests &&
            currentUser.interests &&
            Array.isArray(user.interests) &&
            Array.isArray(currentUser.interests)
          ) {
            const currentUserInterestsLower = currentUser.interests.map(i => i.toLowerCase().trim());
            const userInterestsLower = user.interests.map(i => i.toLowerCase().trim());
            const hasCommonInterest = currentUserInterestsLower.some(i => userInterestsLower.includes(i));
            if (hasCommonInterest) {
              score += 1;
            }
          }
          return { user, score };
        });

        const matchedUsers = scoredUsers.filter((item) => item.score >= 1);
        matchedUsers.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          return (b.user._creationTime || 0) - (a.user._creationTime || 0);
        });

        let selectedUsers = matchedUsers.map((item) => item.user);
        if (selectedUsers.length < 5) {
          const selectedUserIds = new Set(selectedUsers.map((u) => u._id.toString()));
          const otherUsers = potentialUsers.filter((u) => !selectedUserIds.has(u._id.toString()));
          const sortedRecentOthers = otherUsers.sort(
            (a, b) => (b._creationTime || 0) - (a._creationTime || 0)
          );
          const neededCount = 5 - selectedUsers.length;
          const paddingUsers = sortedRecentOthers.slice(0, neededCount);
          selectedUsers = [...selectedUsers, ...paddingUsers];
        }

        const fallbackSuggestions = await Promise.all(
          selectedUsers.map(async (user) => {
            const image = await getUserImageUrl(ctx, user.image);
            return { ...user, image };
          })
        );

        // Add fallback suggestions until we have 5 in total
        const needed = 5 - suggestions.length;
        suggestions = [...suggestions, ...fallbackSuggestions.slice(0, needed)];
      }
    }

    return suggestions;
  },
});

