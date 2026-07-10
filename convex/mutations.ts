import { mutation, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { api, internal } from "./_generated/api";
import { shouldDeleteR2File, createNotification } from "./helpers";

// Updated mutation with all new post fields
export const createPost = mutation({
  args: {
    userId: v.id("users"),
    postType: v.optional(
      v.union(
        v.literal("normal"),
        v.literal("spontaneous_meeting"),
        v.literal("recurring_meeting"),
        v.literal("announcement"),
        v.literal("poll"),
      ),
    ),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    eventDate: v.optional(v.number()),
    eventTime: v.optional(v.string()),
    participantLimit: v.optional(v.number()),
    recurrencePattern: v.optional(v.string()),
    pollOptions: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    mentions: v.optional(v.array(v.string())), // Array von Usernames
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    locationName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const postId = await ctx.db.insert("posts", {
      userId: args.userId,
      postType: args.postType || "normal", // Default für normale Posts
      title: args.title,
      content: args.content || "", // Leerer String wenn kein Content vorhanden
      imageUrl: args.imageUrl,
      eventDate: args.eventDate,
      eventTime: args.eventTime,
      participantLimit: args.participantLimit,
      recurrencePattern: args.recurrencePattern,
      pollOptions: args.pollOptions,
      tags: args.tags,
      mentions: args.mentions,
      latitude: args.latitude,
      longitude: args.longitude,
      locationName: args.locationName,
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
            q.eq("userId", args.userId).eq("postId", args.postId),
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

          // Create notification for post owner (only if liker is not the post owner)
          if (post.userId !== args.userId) {
            // Check for duplicate in last 5 minutes
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
            const recentNotifications = await ctx.db
              .query("notifications")
              .withIndex("by_user_created", (q) => q.eq("userId", post.userId))
              .filter((q) => q.gte(q.field("createdAt"), fiveMinutesAgo))
              .collect();

            const duplicate = recentNotifications.find(
              (n) =>
                n.issuerId === args.userId &&
                n.type === "post_like" &&
                n.targetId === args.postId,
            );

            if (!duplicate) {
              await createNotification(ctx, {
                userId: post.userId,
                issuerId: args.userId,
                type: "post_like",
                targetId: args.postId,
                isRead: false,
                createdAt: Date.now(),
              });
            }
          }

          return { liked: true };
        }
      } catch (error: any) {
        // If it's a write conflict, retry
        if (
          error.message?.includes("write conflict") ||
          error.message?.includes("conflict")
        ) {
          retries++;
          if (retries >= maxRetries) {
            throw new Error(
              "Failed to like post after multiple retries due to write conflicts",
            );
          }
          // Wait a bit before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(100 * Math.pow(2, retries), 1000)),
          );
          continue;
        }
        // If it's a different error, throw it
        throw error;
      }
    }

    throw new Error("Failed to like post after multiple retries");
  },
});

export const createComment = mutation({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
    parentCommentId: v.optional(v.id("comments")),
    content: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate post exists
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // If parentCommentId is provided, validate it exists
    if (args.parentCommentId) {
      const parentComment = await ctx.db.get(args.parentCommentId);
      if (!parentComment) {
        throw new Error("Parent comment not found");
      }
    }

    // Create comment
    const commentId = await ctx.db.insert("comments", {
      userId: args.userId,
      postId: args.postId,
      parentCommentId: args.parentCommentId,
      content: args.content.trim(),
      imageUrl: args.imageUrl,
      likesCount: 0,
      repliesCount: 0,
      createdAt: Date.now(),
    });

    // If this is a reply, update parent comment's repliesCount
    if (args.parentCommentId) {
      const parentReplies = await ctx.db
        .query("comments")
        .withIndex("by_parent", (q) =>
          q.eq("parentCommentId", args.parentCommentId),
        )
        .collect();

      await ctx.db.patch(args.parentCommentId, {
        repliesCount: parentReplies.length,
      });
    }

    // Update post's commentsCount (only top-level comments count)
    const topLevelComments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    const topLevelCount = topLevelComments.filter(
      (c) => !c.parentCommentId,
    ).length;

    await ctx.db.patch(args.postId, {
      commentsCount: topLevelCount,
    });

    // Create notification for post owner (only if commenter is not the post owner)
    if (post.userId !== args.userId) {
      // Check for duplicate in last 5 minutes
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const recentNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_created", (q) => q.eq("userId", post.userId))
        .filter((q) => q.gte(q.field("createdAt"), fiveMinutesAgo))
        .collect();

      const duplicate = recentNotifications.find(
        (n) =>
          n.issuerId === args.userId &&
          n.type === "comment" &&
          n.targetId === commentId,
      );

      if (!duplicate) {
        await createNotification(ctx, {
          userId: post.userId,
          issuerId: args.userId,
          type: "comment",
          targetId: commentId,
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }

    return { success: true, commentId };
  },
});

// Provide an upload URL for client file uploads (alias for workspace usage)
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const result: any = await ctx.storage.generateUploadUrl();
    if (typeof result === "string") return result;
    if (result?.url) return result.url;
    if (result?.uploadUrl) return result.uploadUrl;
    return JSON.stringify(result);
  },
});

export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Validate comment exists and user owns it
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.userId !== args.userId) {
      throw new Error("Not authorized to delete this comment");
    }

    // Get postId before deleting
    const postId = comment.postId;
    const parentCommentId = comment.parentCommentId;

    // Delete all replies to this comment first
    const replies = await ctx.db
      .query("comments")
      .withIndex("by_parent", (q) => q.eq("parentCommentId", args.commentId))
      .collect();

    for (const reply of replies) {
      // Delete all comment likes for this reply
      const replyLikes = await ctx.db
        .query("commentLikes")
        .withIndex("by_comment", (q) => q.eq("commentId", reply._id))
        .collect();

      for (const like of replyLikes) {
        await ctx.db.delete(like._id);
      }

      await ctx.db.delete(reply._id);
    }

    // Delete all comment likes for this comment
    const commentLikes = await ctx.db
      .query("commentLikes")
      .withIndex("by_comment", (q) => q.eq("commentId", args.commentId))
      .collect();

    for (const like of commentLikes) {
      await ctx.db.delete(like._id);
    }

    // Delete the comment itself
    await ctx.db.delete(args.commentId);

    // If this was a reply, update parent comment's repliesCount
    if (parentCommentId) {
      const parentReplies = await ctx.db
        .query("comments")
        .withIndex("by_parent", (q) => q.eq("parentCommentId", parentCommentId))
        .collect();

      await ctx.db.patch(parentCommentId, {
        repliesCount: parentReplies.length,
      });
    }

    // Update post's commentsCount (only top-level comments count)
    const topLevelComments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();

    const topLevelCount = topLevelComments.filter(
      (c) => !c.parentCommentId,
    ).length;

    await ctx.db.patch(postId, {
      commentsCount: topLevelCount,
    });

    if (comment.imageUrl && comment.imageUrl.startsWith("http")) {
      ctx.scheduler.runAfter(0, api.actions.deleteR2File, {
        url: comment.imageUrl,
      });
    }
    for (const reply of replies) {
      if (reply.imageUrl && reply.imageUrl.startsWith("http")) {
        ctx.scheduler.runAfter(0, api.actions.deleteR2File, {
          url: reply.imageUrl,
        });
      }
    }

    return { success: true };
  },
});

export const likeComment = mutation({
  args: {
    userId: v.id("users"),
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const existingLike = await ctx.db
      .query("commentLikes")
      .withIndex("by_user_comment", (q) =>
        q.eq("userId", args.userId).eq("commentId", args.commentId),
      )
      .first();

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    if (existingLike) {
      // Unlike: delete the like and recalculate count
      await ctx.db.delete(existingLike._id);

      const allLikes = await ctx.db
        .query("commentLikes")
        .withIndex("by_comment", (q) => q.eq("commentId", args.commentId))
        .collect();

      await ctx.db.patch(args.commentId, {
        likesCount: allLikes.length,
      });
      return { liked: false };
    } else {
      // Like: insert the like and recalculate count
      await ctx.db.insert("commentLikes", {
        userId: args.userId,
        commentId: args.commentId,
      });

      const allLikes = await ctx.db
        .query("commentLikes")
        .withIndex("by_comment", (q) => q.eq("commentId", args.commentId))
        .collect();

      await ctx.db.patch(args.commentId, {
        likesCount: allLikes.length,
      });

      // Create notification for comment owner (only if liker is not the comment owner)
      if (comment.userId !== args.userId) {
        // Check for duplicate in last 5 minutes
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const recentNotifications = await ctx.db
          .query("notifications")
          .withIndex("by_user_created", (q) => q.eq("userId", comment.userId))
          .filter((q) => q.gte(q.field("createdAt"), fiveMinutesAgo))
          .collect();

        const duplicate = recentNotifications.find(
          (n) =>
            n.issuerId === args.userId &&
            n.type === "comment_like" &&
            n.targetId === args.commentId,
        );

        if (!duplicate) {
          await createNotification(ctx, {
            userId: comment.userId,
            issuerId: args.userId,
            type: "comment_like",
            targetId: args.commentId,
            isRead: false,
            createdAt: Date.now(),
          });
        }
      }

      return { liked: true };
    }
  },
});

export const dislikeComment = mutation({
  args: {
    userId: v.id("users"),
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const existingDislike = await ctx.db
      .query("commentDislikes")
      .withIndex("by_user_comment", (q) =>
        q.eq("userId", args.userId).eq("commentId", args.commentId),
      )
      .first();

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    if (existingDislike) {
      // Undislike: delete the dislike
      await ctx.db.delete(existingDislike._id);
      return { disliked: false };
    } else {
      // Dislike: insert the dislike
      // Also remove like if it exists
      const existingLike = await ctx.db
        .query("commentLikes")
        .withIndex("by_user_comment", (q) =>
          q.eq("userId", args.userId).eq("commentId", args.commentId),
        )
        .first();

      if (existingLike) {
        await ctx.db.delete(existingLike._id);

        const allLikes = await ctx.db
          .query("commentLikes")
          .withIndex("by_comment", (q) => q.eq("commentId", args.commentId))
          .collect();

        await ctx.db.patch(args.commentId, {
          likesCount: allLikes.length,
        });
      }

      await ctx.db.insert("commentDislikes", {
        userId: args.userId,
        commentId: args.commentId,
      });
      return { disliked: true };
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
        q.eq("followerId", args.followerId).eq("followingId", args.followingId),
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

    // Create notification for the followed user
    // Check for duplicate in last 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", args.followingId))
      .filter((q) => q.gte(q.field("createdAt"), fiveMinutesAgo))
      .collect();

    const duplicate = recentNotifications.find(
      (n) => n.issuerId === args.followerId && n.type === "follow",
    );

    if (!duplicate) {
      await createNotification(ctx, {
        userId: args.followingId,
        issuerId: args.followerId,
        type: "follow",
        isRead: false,
        createdAt: Date.now(),
      });
    }

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
        q.eq("followerId", args.followerId).eq("followingId", args.followingId),
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

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    headerImage: v.optional(v.string()),
    bio: v.optional(v.string()),
    major: v.optional(v.string()),
    semester: v.optional(v.number()),
    interests: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updates: {
      name?: string;
      image?: string;
      headerImage?: string;
      bio?: string;
      major?: string;
      semester?: number;
      interests?: string[];
    } = {};
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.image !== undefined) {
      if (shouldDeleteR2File(user.image, args.image)) {
        ctx.scheduler.runAfter(0, api.actions.deleteR2File, {
          url: user.image,
        });
      }
      updates.image = args.image === "" ? undefined : args.image;
    }
    if (args.headerImage !== undefined) {
      if (shouldDeleteR2File(user.headerImage, args.headerImage)) {
        ctx.scheduler.runAfter(0, api.actions.deleteR2File, {
          url: user.headerImage,
        });
      }
      updates.headerImage =
        args.headerImage === "" ? undefined : args.headerImage;
    }
    if (args.bio !== undefined) {
      // If bio is empty string, set to empty string (will be treated as deleted in UI)
      const trimmedBio = args.bio.trim();
      updates.bio = trimmedBio;
    }
    if (args.major !== undefined) {
      // If major is empty string, set to undefined to delete it
      updates.major = args.major === "" ? undefined : args.major;
    }
    if (args.semester !== undefined) {
      updates.semester = args.semester;
    }
    if (args.interests !== undefined) {
      // If empty array, set to undefined to clear interests
      updates.interests =
        args.interests.length > 0 ? args.interests : undefined;
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
    if (
      post.postType !== "spontaneous_meeting" &&
      post.postType !== "recurring_meeting"
    ) {
      throw new Error("This post is not an event");
    }

    // Prüfe ob bereits teilgenommen
    const existingParticipation = await ctx.db
      .query("participants")
      .withIndex("by_user_post", (q) =>
        q.eq("userId", args.userId).eq("postId", args.postId),
      )
      .first();

    if (existingParticipation) {
      throw new Error("Already participating");
    }

    // Prüfe Teilnehmerlimit
    if (
      post.participantLimit &&
      (post.participantsCount ?? 0) >= post.participantLimit
    ) {
      throw new Error("Event is full");
    }

    // Teilnahme hinzufügen
    await ctx.db.insert("participants", {
      userId: args.userId,
      postId: args.postId,
      joinedAt: Date.now(),
    });

    await ctx.db.patch(args.postId, {
      participantsCount: (post.participantsCount ?? 0) + 1,
    });

    // Create notification for event creator (only if participant is not the creator)
    if (post.userId !== args.userId) {
      // Check for duplicate in last 5 minutes
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const recentNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_created", (q) => q.eq("userId", post.userId))
        .filter((q) => q.gte(q.field("createdAt"), fiveMinutesAgo))
        .collect();

      const duplicate = recentNotifications.find(
        (n) =>
          n.issuerId === args.userId &&
          n.type === "event_join" &&
          n.targetId === args.postId,
      );

      if (!duplicate) {
        await createNotification(ctx, {
          userId: post.userId,
          issuerId: args.userId,
          type: "event_join",
          targetId: args.postId,
          eventMetadata: {
            eventType: post.postType as
              | "spontaneous_meeting"
              | "recurring_meeting",
          },
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});

export const createConversation = mutation({
  args: {
    participants: v.array(v.id("users")),
    name: v.optional(v.string()), // Optionaler Name für Gruppen
    creatorId: v.optional(v.id("users")), // Add creatorId argument
    description: v.optional(v.string()), // Group description
    icon: v.optional(v.string()), // Group emoji/icon
    groupType: v.optional(
      v.union(
        v.literal("Study Group"),
        v.literal("Project Team"),
        v.literal("Course Group"),
        v.literal("Event Team"),
        v.literal("Other"),
      ),
    ),
    customGroupType: v.optional(v.string()), // Custom type when "Other" is selected
    currentGoal: v.optional(v.string()), // Current group goal
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    isPublic: v.optional(v.boolean()),
    needsRequestToJoin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const isGroup = args.participants.length > 2 || !!args.name;

    // Nur bei 1:1 Chats prüfen wir auf Duplikate
    if (!isGroup && args.participants.length === 2) {
      const conversations = await ctx.db.query("conversations").collect();
      const existing = conversations.find(
        (c) =>
          !c.isGroup &&
          c.participants.includes(args.participants[0]) &&
          c.participants.includes(args.participants[1]) &&
          c.participants.length === 2,
      );
      if (existing) {
        // Wenn der Chat von einem Teilnehmer gelöscht wurde, heben wir das Löschen auf
        if (existing.deletedBy && existing.deletedBy.length > 0) {
          await ctx.db.patch(existing._id, {
            deletedBy: undefined
          });
        }
        return existing._id;
      }
    }

    const conversationId = await ctx.db.insert("conversations", {
      participants: args.participants,
      name: args.name,
      description: args.description,
      icon: args.icon,
      isGroup,
      isPublic: isGroup ? (args.isPublic ?? false) : undefined,
      needsRequestToJoin: isGroup ? (args.needsRequestToJoin ?? false) : undefined,
      creatorId: args.creatorId,
      adminIds: args.creatorId ? [args.creatorId] : undefined, // Creator is initially the only admin
      updatedAt: Date.now(),
    });

    // If it's a group and we have a creator, create the workspace_groups record
    if (isGroup && args.creatorId) {
      await ctx.db.insert("workspace_groups", {
        conversationId,
        title: args.name,
        description: args.description,
        groupType: args.groupType,
        customGroupType: args.customGroupType,
        currentGoal: args.currentGoal,
        ownerId: args.creatorId,
        adminIds: [args.creatorId],
        createdAt: Date.now(),
        visibility: args.visibility || "private",
      });
    }

    return conversationId;
  },
});

export const updateGroupDetails = mutation({
  args: {
    conversationId: v.id("conversations"),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    groupType: v.optional(
      v.union(
        v.literal("Study Group"),
        v.literal("Project Team"),
        v.literal("Course Group"),
        v.literal("Event Team"),
        v.literal("Other"),
      ),
    ),
    customGroupType: v.optional(v.string()), // Custom type when "Other" is selected
    currentGoal: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    userId: v.id("users"), // User making the update (for permission check)
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Group not found");

    // Check if user is owner or admin
    const isOwnerOrAdmin =
      conversation.creatorId === args.userId ||
      conversation.adminIds?.includes(args.userId);
    if (!isOwnerOrAdmin)
      throw new Error("Only group owner/admin can update details");

    // Update conversations table
    const updates: any = {};
    if (args.description !== undefined) updates.description = args.description;
    if (args.icon !== undefined) updates.icon = args.icon;
    updates.updatedAt = Date.now();

    await ctx.db.patch(args.conversationId, updates);

    // Update workspace_groups table if it exists
    const workspaceGroup = await ctx.db
      .query("workspace_groups")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();

    if (workspaceGroup) {
      const wsUpdates: any = {};
      if (args.groupType !== undefined) wsUpdates.groupType = args.groupType;
      if (args.customGroupType !== undefined)
        wsUpdates.customGroupType = args.customGroupType;
      if (args.currentGoal !== undefined)
        wsUpdates.currentGoal = args.currentGoal;
      if (args.visibility !== undefined) wsUpdates.visibility = args.visibility;
      if (Object.keys(wsUpdates).length > 0) {
        await ctx.db.patch(workspaceGroup._id, wsUpdates);
      }
    }

    return { success: true };
  },
});

export const updateGroupImage = mutation({
  args: {
    conversationId: v.id("conversations"),
    imageId: v.optional(v.string()),
    userId: v.optional(v.id("users")), // User ID of who is updating
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // If userId is provided, check if they are admin
    if (args.userId && conversation.isGroup) {
      const isAdmin =
        conversation.adminIds?.includes(args.userId) ||
        conversation.creatorId === args.userId;
      if (!isAdmin) throw new Error("Only admins can change group image");
    }

    if (shouldDeleteR2File(conversation.image, args.imageId)) {
      ctx.scheduler.runAfter(0, api.actions.deleteR2File, {
        url: conversation.image,
      });
    }

    await ctx.db.patch(args.conversationId, {
      image: args.imageId === "" ? undefined : args.imageId,
    });

    // Create system message
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      if (user) {
        await ctx.db.insert("messages", {
          conversationId: args.conversationId,
          senderId: args.userId,
          content: `${user.name} hat das Gruppenbild geändert`,
          type: "system",
          createdAt: Date.now(),
        });
      }
    }
  },
});

export const updateGroupName = mutation({
  args: {
    conversationId: v.id("conversations"),
    name: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    if (!conversation.isGroup) throw new Error("Can only rename group chats");

    // Check admin permissions
    const isAdmin =
      conversation.adminIds?.includes(args.userId) ||
      conversation.creatorId === args.userId;
    if (!isAdmin) throw new Error("Only admins can rename the group");

    const oldName = conversation.name || "Gruppe";

    await ctx.db.patch(args.conversationId, {
      name: args.name.trim(),
    });

    // Create system message
    const user = await ctx.db.get(args.userId);
    if (user) {
      await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        senderId: args.userId,
        content: `${user.name} hat den Gruppennamen von "${oldName}" zu "${args.name.trim()}" geändert`,
        type: "system",
        createdAt: Date.now(),
      });
    }
  },
});

export const updateGroupDescription = mutation({
  args: {
    conversationId: v.id("conversations"),
    description: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    if (!conversation.isGroup)
      throw new Error("Can only update group descriptions");

    // Check admin permissions
    const isAdmin =
      conversation.adminIds?.includes(args.userId) ||
      conversation.creatorId === args.userId;
    if (!isAdmin)
      throw new Error("Only admins can update the group description");

    await ctx.db.patch(args.conversationId, {
      description: args.description.trim(),
    });
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    type: v.optional(
      v.union(
        v.literal("text"),
        v.literal("system"),
        v.literal("image"),
        v.literal("video"),
        v.literal("pdf"),
        v.literal("poll"),
        v.literal("post"),
        v.literal("profile"),
        v.literal("event_invite"),
        v.literal("location"),
        v.literal("live_location"),
      ),
    ),
    storageId: v.optional(v.string()),
    fileName: v.optional(v.string()),
    contentType: v.optional(v.string()),
    chatPollId: v.optional(v.id("chatPolls")),
    chatEventId: v.optional(v.id("chatEvents")),
    sharedPostId: v.optional(v.id("posts")),
    sharedProfileId: v.optional(v.id("users")),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    address: v.optional(v.string()),
    liveDuration: v.optional(v.number()),
    liveExpiresAt: v.optional(v.number()),
    isLiveActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Validate membership
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Explicitly check if user is a participant (security best practice)
    if (!conversation.participants.includes(args.senderId)) {
      throw new Error("User is not a participant of this conversation");
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      content: args.content,
      type: args.type || "text",
      storageId: args.storageId,
      fileName: args.fileName,
      contentType: args.contentType,
      chatPollId: args.chatPollId,
      chatEventId: args.chatEventId,
      sharedPostId: args.sharedPostId,
      sharedProfileId: args.sharedProfileId,
      latitude: args.latitude,
      longitude: args.longitude,
      address: args.address,
      liveDuration: args.liveDuration,
      liveExpiresAt: args.liveExpiresAt,
      isLiveActive: args.isLiveActive,
      createdAt: Date.now(),
    });

    // If it's a live location, register initial coordinates
    if (
      args.type === "live_location" &&
      args.latitude !== undefined &&
      args.longitude !== undefined
    ) {
      await ctx.db.insert("liveLocations", {
        messageId,
        userId: args.senderId,
        latitude: args.latitude,
        longitude: args.longitude,
        updatedAt: Date.now(),
      });
    }

    // Update conversation: lastMessageId und updatedAt, and clear deletedBy
    await ctx.db.patch(args.conversationId, {
      lastMessageId: messageId,
      updatedAt: Date.now(),
      deletedBy: undefined,
    });

    // Push notification to the other participants (best-effort, never blocks send)
    const messageType = args.type || "text";
    if (messageType !== "system") {
      try {
        const sender = await ctx.db.get(args.senderId);
        const senderName = sender?.name || "Neue Nachricht";
        const left = conversation.leftParticipants || [];
        const recipients = conversation.participants.filter(
          (id) => id !== args.senderId && !left.includes(id),
        );

        if (recipients.length > 0) {
          let preview: string;
          switch (messageType) {
            case "image":
              preview = "📷 Bild";
              break;
            case "video":
              preview = "🎥 Video";
              break;
            case "pdf":
              preview = args.fileName ? `📄 ${args.fileName}` : "📄 Datei";
              break;
            case "poll":
              preview = `📊 Umfrage: ${args.content}`;
              break;
            case "post":
              preview = "🔗 Beitrag geteilt";
              break;
            case "profile":
              preview = "👤 Profil geteilt";
              break;
            case "event_invite":
              preview = "📅 Termin";
              break;
            default:
              preview =
                args.content.length > 120
                  ? `${args.content.slice(0, 117)}…`
                  : args.content;
          }

          const isGroup = conversation.isGroup === true;
          await ctx.scheduler.runAfter(0, internal.pushActions.sendPush, {
            userIds: recipients,
            payload: {
              title: isGroup ? conversation.name || "Gruppe" : senderName,
              body: isGroup ? `${senderName}: ${preview}` : preview,
              url: `/chat/${args.conversationId}`,
            },
          });
        }
      } catch (err) {
        console.error("[push] failed to schedule chat push", err);
      }
    }

    return messageId;
  },
});

export const sendChatPoll = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    question: v.string(),
    options: v.array(v.string()),
    allowMultiple: v.boolean(),
    closeAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (!conversation.participants.includes(args.senderId)) {
      throw new Error("User is not a participant of this conversation");
    }
    if (args.options.length < 2)
      throw new Error("Poll must have at least 2 options");
    if (args.question.trim() === "")
      throw new Error("Poll question cannot be empty");

    const pollId = await ctx.db.insert("chatPolls", {
      conversationId: args.conversationId,
      creatorId: args.senderId,
      question: args.question.trim(),
      options: args.options.map((o) => o.trim()).filter((o) => o !== ""),
      allowMultiple: args.allowMultiple,
      closeAt: args.closeAt,
      createdAt: Date.now(),
    });

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      content: args.question.trim(),
      type: "poll",
      chatPollId: pollId,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageId: messageId,
      updatedAt: Date.now(),
      deletedBy: undefined,
    });

    return { pollId, messageId };
  },
});

export const voteChatPoll = mutation({
  args: {
    chatPollId: v.id("chatPolls"),
    userId: v.id("users"),
    optionIndices: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const poll = await ctx.db.get(args.chatPollId);
    if (!poll) throw new Error("Poll not found");

    // Check conversation membership
    const conversation = await ctx.db.get(poll.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (!conversation.participants.includes(args.userId)) {
      throw new Error("Only chat members can vote");
    }

    // Check if poll is closed
    if (poll.closeAt && Date.now() > poll.closeAt) {
      throw new Error("Poll has closed");
    }

    // Validate option indices
    for (const idx of args.optionIndices) {
      if (idx < 0 || idx >= poll.options.length) {
        throw new Error("Invalid option index");
      }
    }

    // If single-answer, ensure only one option
    const indices = poll.allowMultiple
      ? args.optionIndices
      : args.optionIndices.slice(0, 1);

    // Upsert vote
    const existing = await ctx.db
      .query("chatPollVotes")
      .withIndex("by_poll_user", (q) =>
        q.eq("chatPollId", args.chatPollId).eq("userId", args.userId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        optionIndices: indices,
        votedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("chatPollVotes", {
        chatPollId: args.chatPollId,
        userId: args.userId,
        optionIndices: indices,
        votedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const toggleMessageReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const reactions = message.reactions || [];
    const existingIndex = reactions.findIndex((r) => r.userId === args.userId);

    let newReactions;
    if (existingIndex !== -1) {
      const existingReaction = reactions[existingIndex];
      if (existingReaction.emoji === args.emoji) {
        // Remove reaction (toggle off)
        newReactions = [
          ...reactions.slice(0, existingIndex),
          ...reactions.slice(existingIndex + 1),
        ];
      } else {
        // Replace with new emoji
        newReactions = [...reactions];
        newReactions[existingIndex] = {
          emoji: args.emoji,
          userId: args.userId,
        };
      }
    } else {
      // Add new reaction
      newReactions = [...reactions, { emoji: args.emoji, userId: args.userId }];
    }

    await ctx.db.patch(args.messageId, { reactions: newReactions });
  },
});

export const addConversationMember = mutation({
  args: {
    conversationId: v.id("conversations"),
    adminId: v.id("users"),
    newMemberId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    if (!conversation.isGroup)
      throw new Error("Can only add members to group chats");

    // Check admin permissions
    const isAdmin =
      conversation.adminIds?.includes(args.adminId) ||
      conversation.creatorId === args.adminId;
    if (!isAdmin) throw new Error("Only admins can add members");

    if (conversation.participants.includes(args.newMemberId)) {
      throw new Error("User already in group");
    }

    // Add member
    // Add member and remove from leftParticipants if present
    const leftParticipants = conversation.leftParticipants || [];
    const newLeftParticipants = leftParticipants.filter(
      (id) => id !== args.newMemberId,
    );

    await ctx.db.patch(args.conversationId, {
      participants: [...conversation.participants, args.newMemberId],
      leftParticipants: newLeftParticipants,
      // Remove from leftMetadata if present
      leftMetadata: (conversation.leftMetadata || []).filter(
        (m) => m.userId !== args.newMemberId,
      ),
    });

    // Create system message
    const adminUser = await ctx.db.get(args.adminId);
    const newMember = await ctx.db.get(args.newMemberId);

    if (adminUser && newMember) {
      await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        senderId: args.adminId, // System message attributed to admin
        content: `${adminUser.name} hat ${newMember.name} hinzugefügt`,
        type: "system",
        createdAt: Date.now(),
      });
    }

    // Initialize last_reads for the new member so they don't see old messages as unread
    await ctx.db.insert("last_reads", {
      userId: args.newMemberId,
      conversationId: args.conversationId,
      lastReadAt: Date.now(),
    });
  },
});

export const removeConversationMember = mutation({
  args: {
    conversationId: v.id("conversations"),
    adminId: v.id("users"),
    memberIdToRemove: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Check admin permissions
    const isAdmin =
      conversation.adminIds?.includes(args.adminId) ||
      conversation.creatorId === args.adminId;
    if (!isAdmin) throw new Error("Only admins can remove members");

    // Cannot remove creator
    if (args.memberIdToRemove === conversation.creatorId) {
      throw new Error("Cannot remove group creator");
    }

    const newParticipants = conversation.participants.filter(
      (id) => id !== args.memberIdToRemove,
    );
    const newAdmins = conversation.adminIds?.filter(
      (id) => id !== args.memberIdToRemove,
    );

    // Ensure uniqueness in leftParticipants
    const currentLeft = conversation.leftParticipants || [];
    const newLeftParticipants = currentLeft.includes(args.memberIdToRemove)
      ? currentLeft
      : [...currentLeft, args.memberIdToRemove];

    // Update leftMetadata
    const currentMetadata = conversation.leftMetadata || [];
    // Remove old entry if exists (though unlikely for active member) and add new one
    const newMetadata = [
      ...currentMetadata.filter((m) => m.userId !== args.memberIdToRemove),
      { userId: args.memberIdToRemove, leftAt: Date.now() },
    ];

    await ctx.db.patch(args.conversationId, {
      participants: newParticipants,
      adminIds: newAdmins,
      leftParticipants: newLeftParticipants,
      leftMetadata: newMetadata,
    });

    // System message
    const adminUser = await ctx.db.get(args.adminId);
    const removedMember = await ctx.db.get(args.memberIdToRemove);

    if (adminUser && removedMember) {
      await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        senderId: args.adminId,
        content: `${adminUser.name} hat ${removedMember.name} entfernt`,
        type: "system",
        visibleTo: [...newParticipants, args.memberIdToRemove], // Visible to remaining members + removed user (as final msg)
        createdAt: Date.now(),
      });
    }
  },
});

export const leaveGroup = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new ConvexError("Conversation not found");

    if (!conversation.participants.includes(args.userId)) {
      throw new ConvexError("User not in group");
    }

    // If user is the creator, they must transfer creator status first
    if (conversation.creatorId === args.userId) {
      throw new ConvexError("Creator must transfer creator status before leaving the group");
    }

    const newParticipants = conversation.participants.filter(
      (id) => id !== args.userId,
    );
    const newAdmins = conversation.adminIds?.filter((id) => id !== args.userId);

    // Ensure uniqueness in leftParticipants
    const currentLeft = conversation.leftParticipants || [];
    const newLeftParticipants = currentLeft.includes(args.userId)
      ? currentLeft
      : [...currentLeft, args.userId];

    // Update leftMetadata
    const currentMetadata = conversation.leftMetadata || [];
    const newMetadata = [
      ...currentMetadata.filter((m) => m.userId !== args.userId),
      { userId: args.userId, leftAt: Date.now() },
    ];

    await ctx.db.patch(args.conversationId, {
      participants: newParticipants,
      adminIds: newAdmins,
      leftParticipants: newLeftParticipants,
      leftMetadata: newMetadata,
    });

    const user = await ctx.db.get(args.userId);
    if (user) {
      await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        senderId: args.userId,
        content: `${user.name} hat die Gruppe verlassen`,
        type: "system",
        visibleTo: [...newParticipants, args.userId],
        createdAt: Date.now(),
      });
    }
  },
});

export const deleteConversationFromList = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    if (conversation.isGroup) {
      // Only allow if user is in leftParticipants
      if (!conversation.leftParticipants?.includes(args.userId)) {
        throw new Error("Cannot delete active conversation. Leave first.");
      }

      const newLeftParticipants = conversation.leftParticipants.filter(id => id !== args.userId);
      const newMetadata = (conversation.leftMetadata || []).filter(m => m.userId !== args.userId);

      await ctx.db.patch(args.conversationId, {
        leftParticipants: newLeftParticipants,
        leftMetadata: newMetadata,
      });
    } else {
      // For individual (1:1) chats, add the user's ID to deletedBy array
      const currentDeleted = conversation.deletedBy || [];
      const newDeleted = currentDeleted.includes(args.userId)
        ? currentDeleted
        : [...currentDeleted, args.userId];

      await ctx.db.patch(args.conversationId, {
        deletedBy: newDeleted,
      });
    }
  }
});

export const promoteToAdmin = mutation({
  args: {
    conversationId: v.id("conversations"),
    adminId: v.id("users"), // The admin performing the action
    memberIdToPromote: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const isAdmin =
      conversation.adminIds?.includes(args.adminId) ||
      conversation.creatorId === args.adminId;
    if (!isAdmin) throw new Error("Only admins can promote members");

    const currentAdmins = conversation.adminIds || [];
    if (!currentAdmins.includes(args.memberIdToPromote)) {
      await ctx.db.patch(args.conversationId, {
        adminIds: [...currentAdmins, args.memberIdToPromote],
      });

      const adminUser = await ctx.db.get(args.adminId);
      const promotedUser = await ctx.db.get(args.memberIdToPromote);
      if (adminUser && promotedUser) {
        await ctx.db.insert("messages", {
          conversationId: args.conversationId,
          senderId: args.adminId,
          content: `${adminUser.name} hat ${promotedUser.name} zum Admin ernannt`,
          type: "system",
          visibleTo: [args.adminId, args.memberIdToPromote], // Only visible to involved parties
          createdAt: Date.now(),
        });
      }
    }
  },
});

export const demoteAdmin = mutation({
  args: {
    conversationId: v.id("conversations"),
    adminId: v.id("users"),
    memberIdToDemote: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const isAdmin =
      conversation.adminIds?.includes(args.adminId) ||
      conversation.creatorId === args.adminId;
    if (!isAdmin) throw new Error("Only admins can demote members");

    // Cannot demote creator
    if (args.memberIdToDemote === conversation.creatorId) {
      throw new Error("Cannot demote group creator");
    }

    const currentAdmins = conversation.adminIds || [];
    const newAdmins = currentAdmins.filter(
      (id) => id !== args.memberIdToDemote,
    );

    await ctx.db.patch(args.conversationId, {
      adminIds: newAdmins,
    });

    const adminUser = await ctx.db.get(args.adminId);
    const demotedUser = await ctx.db.get(args.memberIdToDemote);
    if (adminUser && demotedUser) {
      await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        senderId: args.adminId,
        content: `${adminUser.name} hat ${demotedUser.name} Admin-Rechte entzogen`,
        type: "system",
        visibleTo: [args.adminId, args.memberIdToDemote], // Only visible to involved parties
        createdAt: Date.now(),
      });
    }
  },
});

export const deleteConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.optional(v.id("users")), // Optional user ID for authorization check
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    if (args.userId && conversation.isGroup) {
      if (conversation.creatorId !== args.userId) {
        throw new Error("Only the group creator can delete the group");
      }
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    for (const msg of messages) {
      if (msg.storageId && msg.storageId.startsWith("http")) {
        ctx.scheduler.runAfter(0, api.actions.deleteR2File, {
          url: msg.storageId,
        });
      }
      await ctx.db.delete(msg._id);
    }

    const lastReads = await ctx.db
      .query("last_reads")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    for (const read of lastReads) {
      await ctx.db.delete(read._id);
    }

    if (conversation.image && conversation.image.startsWith("http")) {
      ctx.scheduler.runAfter(0, api.actions.deleteR2File, {
        url: conversation.image,
      });
    }

    await ctx.db.delete(args.conversationId);

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
        q.eq("userId", args.userId).eq("postId", args.postId),
      )
      .first();

    if (!existingParticipation) {
      throw new Error("Not participating");
    }

    await ctx.db.delete(existingParticipation._id);
    await ctx.db.patch(args.postId, {
      participantsCount: Math.max(0, (post.participantsCount ?? 0) - 1),
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
        q.eq("userId", args.userId).eq("postId", args.postId),
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

export const deletePost = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post nicht gefunden");
    if (post.userId !== args.userId)
      throw new Error("Nicht berechtigt, diesen Post zu löschen");

    const likes = await ctx.db
      .query("likes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    for (const participant of participants) {
      await ctx.db.delete(participant._id);
    }

    const pollVotes = await ctx.db
      .query("pollVotes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    for (const vote of pollVotes) {
      await ctx.db.delete(vote._id);
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    for (const comment of comments) {
      const commentLikes = await ctx.db
        .query("commentLikes")
        .withIndex("by_comment", (q) => q.eq("commentId", comment._id))
        .collect();

      for (const like of commentLikes) {
        await ctx.db.delete(like._id);
      }

      if (comment.imageUrl && comment.imageUrl.startsWith("http")) {
        ctx.scheduler.runAfter(0, api.actions.deleteR2File, {
          url: comment.imageUrl,
        });
      }

      await ctx.db.delete(comment._id);
    }

    await ctx.db.delete(args.postId);

    if (post.imageUrl && post.imageUrl.startsWith("http")) {
      ctx.scheduler.runAfter(0, api.actions.deleteR2File, {
        url: post.imageUrl,
      });
    }

    return { success: true };
  },
});

export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("last_reads")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", args.userId).eq("conversationId", args.conversationId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastReadAt: Date.now(),
      });
    } else {
      await ctx.db.insert("last_reads", {
        userId: args.userId,
        conversationId: args.conversationId,
        lastReadAt: Date.now(),
      });
    }

    // Falls die Konversation als gelöscht markiert war, entfernen wir den User aus deletedBy
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation && conversation.deletedBy?.includes(args.userId)) {
      const newDeleted = conversation.deletedBy.filter(id => id !== args.userId);
      await ctx.db.patch(args.conversationId, {
        deletedBy: newDeleted.length > 0 ? newDeleted : undefined,
      });
    }
  },
});

export const transferCreator = mutation({
  args: {
    conversationId: v.id("conversations"),
    currentCreatorId: v.id("users"),
    newCreatorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    if (!conversation.isGroup) throw new Error("Not a group");

    // Validate that the current user is actually the creator
    if (conversation.creatorId !== args.currentCreatorId) {
      throw new Error("Only the creator can transfer creator status");
    }

    // Cannot transfer to self
    if (args.currentCreatorId === args.newCreatorId) {
      throw new Error("Cannot transfer creator status to yourself");
    }

    // Validate that the new creator is an active participant
    if (!conversation.participants.includes(args.newCreatorId)) {
      throw new Error("New creator must be an active member of the group");
    }

    // Validate that the new creator is not in leftParticipants
    const leftParticipants = conversation.leftParticipants || [];
    if (leftParticipants.includes(args.newCreatorId)) {
      throw new Error(
        "Cannot transfer creator status to a user who has left the group",
      );
    }

    // Update adminIds: ensure new creator is in adminIds
    const currentAdmins = conversation.adminIds || [];
    const newAdmins = currentAdmins.includes(args.newCreatorId)
      ? currentAdmins
      : [...currentAdmins, args.newCreatorId];

    // Transfer creator status
    await ctx.db.patch(args.conversationId, {
      creatorId: args.newCreatorId,
      adminIds: newAdmins,
    });

    // Create system message
    const oldCreator = await ctx.db.get(args.currentCreatorId);
    const newCreator = await ctx.db.get(args.newCreatorId);

    if (oldCreator && newCreator) {
      await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        senderId: args.currentCreatorId,
        content: `${oldCreator.name} hat die Gruppenleitung an ${newCreator.name} übertragen`,
        type: "system",
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const claimGroupOwnership = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    if (!conversation.isGroup) throw new Error("Not a group");

    const hasCreator = !!conversation.creatorId;
    const hasAdmins = conversation.adminIds && conversation.adminIds.length > 0;

    if (hasCreator || hasAdmins) {
      throw new Error("Group already has ownership defined");
    }

    await ctx.db.patch(args.conversationId, {
      creatorId: args.userId,
      adminIds: [args.userId],
    });

    return { success: true };
  },
});

export const stopLiveLocation = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== args.userId) {
      throw new Error("Only the sender can stop sharing their location");
    }

    await ctx.db.patch(args.messageId, {
      isLiveActive: false,
    });

    // Delete active live locations entry for this message to keep table clean
    const activeLoc = await ctx.db
      .query("liveLocations")
      .withIndex("by_message_user", (q) =>
        q.eq("messageId", args.messageId).eq("userId", args.userId),
      )
      .first();
    if (activeLoc) {
      await ctx.db.delete(activeLoc._id);
    }
    return { success: true };
  },
});

export const toggleGroupPublic = mutation({
  args: {
    conversationId: v.id("conversations"),
    isPublic: v.boolean(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (!conversation.isGroup)
      throw new Error("Can only toggle public state for group chats");

    // Check admin permissions
    const isAdmin =
      conversation.adminIds?.includes(args.userId) ||
      conversation.creatorId === args.userId;
    if (!isAdmin) throw new Error("Only admins can change group visibility");

    // Default needsRequestToJoin to true when group is made public
    await ctx.db.patch(args.conversationId, {
      isPublic: args.isPublic,
      needsRequestToJoin: args.isPublic ? true : undefined,
    });

    // Create system message
    const user = await ctx.db.get(args.userId);
    if (user) {
      await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        senderId: args.userId,
        content: args.isPublic
          ? `${user.name} hat die Gruppe öffentlich gemacht`
          : `${user.name} hat die Gruppe privat gemacht`,
        type: "system",
        createdAt: Date.now(),
      });
    }
    return { success: true };
  },
});

export const updateLiveLocationCoordinates = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== args.userId) {
      throw new Error("Unauthorized coordinate update");
    }

    // Check if the live sharing is still active and not expired
    if (!message.isLiveActive) {
      return { success: false, reason: "Inactive" };
    }
    if (message.liveExpiresAt && Date.now() > message.liveExpiresAt) {
      await ctx.db.patch(args.messageId, { isLiveActive: false });
      // Delete active loc
      const activeLoc = await ctx.db
        .query("liveLocations")
        .withIndex("by_message_user", (q) =>
          q.eq("messageId", args.messageId).eq("userId", args.userId),
        )
        .first();
      if (activeLoc) await ctx.db.delete(activeLoc._id);
      return { success: false, reason: "Expired" };
    }

    // Update message coordinate
    await ctx.db.patch(args.messageId, {
      latitude: args.latitude,
      longitude: args.longitude,
    });

    // Update or insert liveLocations table
    const activeLoc = await ctx.db
      .query("liveLocations")
      .withIndex("by_message_user", (q) =>
        q.eq("messageId", args.messageId).eq("userId", args.userId),
      )
      .first();

    if (activeLoc) {
      await ctx.db.patch(activeLoc._id, {
        latitude: args.latitude,
        longitude: args.longitude,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("liveLocations", {
        messageId: args.messageId,
        userId: args.userId,
        latitude: args.latitude,
        longitude: args.longitude,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const toggleGroupJoinRequestRequired = mutation({
  args: {
    conversationId: v.id("conversations"),
    needsRequestToJoin: v.boolean(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (!conversation.isGroup)
      throw new Error("Can only toggle join request setting for groups");

    // Check admin permissions
    const isAdmin =
      conversation.adminIds?.includes(args.userId) ||
      conversation.creatorId === args.userId;
    if (!isAdmin)
      throw new Error("Only admins can change group join request settings");

    await ctx.db.patch(args.conversationId, {
      needsRequestToJoin: args.needsRequestToJoin,
    });

    // Create system message
    const user = await ctx.db.get(args.userId);
    if (user) {
      await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        senderId: args.userId,
        content: args.needsRequestToJoin
          ? `${user.name} hat Beitrittsanfragen für diese Gruppe aktiviert`
          : `${user.name} hat den direkten Beitritt für diese Gruppe aktiviert`,
        type: "system",
        createdAt: Date.now(),
      });
    }
    return { success: true };
  },
});

export const joinPublicGroup = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (!conversation.isGroup) throw new Error("Not a group chat");
    if (!conversation.isPublic) throw new Error("Group is not public");
    if (conversation.needsRequestToJoin)
      throw new Error("Approval is required to join this group");

    if (conversation.participants.includes(args.userId)) {
      throw new Error("Already a member of this group");
    }

    const leftParticipants = conversation.leftParticipants || [];
    const newLeftParticipants = leftParticipants.filter(
      (id) => id !== args.userId,
    );

    // Add participant to the conversation
    await ctx.db.patch(args.conversationId, {
      participants: [...conversation.participants, args.userId],
      leftParticipants: newLeftParticipants,
      leftMetadata: (conversation.leftMetadata || []).filter(
        (m) => m.userId !== args.userId,
      ),
      updatedAt: Date.now(),
    });

    // Create system message: "... ist der gruppe beigetreten"
    const user = await ctx.db.get(args.userId);
    if (user) {
      await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        senderId: args.userId,
        content: `${user.name} ist der Gruppe beigetreten`,
        type: "system",
        createdAt: Date.now(),
      });
    }

    // Upsert/Insert last_reads for the user
    const existingLastRead = await ctx.db
      .query("last_reads")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", args.userId).eq("conversationId", args.conversationId),
      )
      .first();

    if (existingLastRead) {
      await ctx.db.patch(existingLastRead._id, {
        lastReadAt: Date.now(),
      });
    } else {
      await ctx.db.insert("last_reads", {
        userId: args.userId,
        conversationId: args.conversationId,
        lastReadAt: Date.now(),
      });
    }

    return args.conversationId;
  },
});

export const requestToJoinPublicGroup = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Group not found");
    if (!conversation.isGroup) throw new Error("Not a group");
    if (!conversation.isPublic) throw new Error("Group is not public");
    if (!conversation.needsRequestToJoin)
      throw new Error("Group does not require approval to join");

    if (conversation.participants.includes(args.userId)) {
      throw new Error("Already a member of this group");
    }

    // Check for existing pending request
    const existingRequest = await ctx.db
      .query("joinRequests")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", args.userId),
      )
      .first();

    if (existingRequest && existingRequest.status === "pending") {
      return {
        success: true,
        requestId: existingRequest._id,
        alreadyRequested: true,
      };
    }

    // Create or update request to pending
    let requestId;
    if (existingRequest) {
      await ctx.db.patch(existingRequest._id, {
        status: "pending",
        createdAt: Date.now(),
      });
      requestId = existingRequest._id;
    } else {
      requestId = await ctx.db.insert("joinRequests", {
        conversationId: args.conversationId,
        userId: args.userId,
        status: "pending",
        createdAt: Date.now(),
      });
    }

    // Find admins/creators to notify
    const adminIds = [
      ...(conversation.creatorId ? [conversation.creatorId] : []),
      ...(conversation.adminIds || []),
    ];

    // Deduplicate keeping original Id objects
    const seen = new Set<string>();
    const uniqueAdminIds = adminIds.filter((id) => {
      const idStr = id.toString();
      if (seen.has(idStr)) return false;
      seen.add(idStr);
      return true;
    });

    const resolvedAdmins = await Promise.all(
      uniqueAdminIds.map((id) => ctx.db.get(id)),
    );

    for (const admin of resolvedAdmins) {
      if (admin && admin._id !== args.userId) {
        // Create notification
        await createNotification(ctx, {
          userId: admin._id,
          issuerId: args.userId,
          type: "group_join_request",
          targetId: requestId,
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }

    return { success: true, requestId };
  },
});

export const handleJoinRequest = mutation({
  args: {
    requestId: v.id("joinRequests"),
    adminId: v.id("users"),
    approve: v.boolean(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== "pending")
      throw new Error("Request is already handled");

    const conversation = await ctx.db.get(request.conversationId);
    if (!conversation) throw new Error("Group not found");

    // Check if adminId is admin or creator
    const isAdmin =
      conversation.adminIds?.includes(args.adminId) ||
      conversation.creatorId === args.adminId;
    if (!isAdmin) throw new Error("Only admins can handle join requests");

    if (args.approve) {
      // Update request
      await ctx.db.patch(args.requestId, { status: "approved" });

      // Create notification for the requesting user
      await createNotification(ctx, {
        userId: request.userId,
        issuerId: args.adminId,
        type: "group_join_accept",
        targetId: request.conversationId,
        isRead: false,
        createdAt: Date.now(),
      });

      // Add user to conversation if not already added
      if (!conversation.participants.includes(request.userId)) {
        const leftParticipants = conversation.leftParticipants || [];
        const newLeftParticipants = leftParticipants.filter(
          (id) => id !== request.userId,
        );

        await ctx.db.patch(request.conversationId, {
          participants: [...conversation.participants, request.userId],
          leftParticipants: newLeftParticipants,
          leftMetadata: (conversation.leftMetadata || []).filter(
            (m) => m.userId !== request.userId,
          ),
          updatedAt: Date.now(),
        });

        // Create system message
        const user = await ctx.db.get(request.userId);
        if (user) {
          await ctx.db.insert("messages", {
            conversationId: request.conversationId,
            senderId: request.userId,
            content: `${user.name} ist der Gruppe beigetreten`,
            type: "system",
            createdAt: Date.now(),
          });
        }

        // last_reads
        const existingLastRead = await ctx.db
          .query("last_reads")
          .withIndex("by_user_conversation", (q) =>
            q
              .eq("userId", request.userId)
              .eq("conversationId", request.conversationId),
          )
          .first();

        if (existingLastRead) {
          await ctx.db.patch(existingLastRead._id, { lastReadAt: Date.now() });
        } else {
          await ctx.db.insert("last_reads", {
            userId: request.userId,
            conversationId: request.conversationId,
            lastReadAt: Date.now(),
          });
        }
      }
    } else {
      // Update request to rejected
      await ctx.db.patch(args.requestId, { status: "rejected" });

      // Create notification for the requesting user
      await createNotification(ctx, {
        userId: request.userId,
        issuerId: args.adminId,
        type: "group_join_reject",
        targetId: request.conversationId,
        isRead: false,
        createdAt: Date.now(),
      });
    }

    // Delete all group_join_request notifications for this requestId (clean up from DB)
    const notifications = await ctx.db.query("notifications").collect();
    const relevantNotis = notifications.filter(
      (n) => n.type === "group_join_request" && n.targetId === args.requestId,
    );

    for (const noti of relevantNotis) {
      await ctx.db.delete(noti._id);
    }

    return { success: true };
  },
});
