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
    imageIds: v.optional(v.array(v.id("_storage"))), // Array von Bild-IDs für mehrere Bilder (bis zu 4) - neuer Standard
    storageIds: v.optional(v.array(v.id("_storage"))), // Legacy: Array von Storage IDs (Alias für imageIds)
    storageId: v.optional(v.id("_storage")), // Legacy: Einzelnes Bild (für Rückwärtskompatibilität)
    imageUrl: v.optional(v.string()), // Legacy: Fallback für externe URLs
    eventDate: v.optional(v.number()),
    eventTime: v.optional(v.string()),
    participantLimit: v.optional(v.number()),
    recurrencePattern: v.optional(v.string()),
    pollOptions: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    mentions: v.optional(v.array(v.string())), // Array von Usernames
  },
  handler: async (ctx, args) => {
    // Begrenze auf max 4 Bilder (Twitter-Standard)
    // Priorisiere imageIds (neuer Standard), dann storageIds (Legacy), dann storageId (Legacy Single)
    const finalImageIds = (args.imageIds || args.storageIds) && (args.imageIds?.length || args.storageIds?.length) > 0 
      ? (args.imageIds || args.storageIds)!.slice(0, 4) // Max 4 Bilder (Twitter-Limit)
      : args.storageId 
        ? [args.storageId] 
        : undefined;

    const postId = await ctx.db.insert("posts", {
      userId: args.userId,
      postType: args.postType || "normal", // Default für normale Posts
      title: args.title,
      content: args.content,
      imageIds: finalImageIds && finalImageIds.length > 1 ? finalImageIds : undefined, // Neuer Standard: Array
      storageIds: finalImageIds && finalImageIds.length > 1 ? finalImageIds : undefined, // Legacy: Array (für Rückwärtskompatibilität)
      storageId: finalImageIds && finalImageIds.length === 1 ? finalImageIds[0] : undefined, // Legacy: Einzelnes Bild
      imageUrl: args.imageUrl, // Legacy: Fallback für externe URLs
      eventDate: args.eventDate,
      eventTime: args.eventTime,
      participantLimit: args.participantLimit,
      recurrencePattern: args.recurrencePattern,
      pollOptions: args.pollOptions,
      tags: args.tags,
      mentions: args.mentions,
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
        .withIndex("by_parent", (q) => q.eq("parentCommentId", args.parentCommentId))
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
    
    const topLevelCount = topLevelComments.filter(c => !c.parentCommentId).length;

    await ctx.db.patch(args.postId, {
      commentsCount: topLevelCount,
    });

    return { success: true, commentId };
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
    
    const topLevelCount = topLevelComments.filter(c => !c.parentCommentId).length;

    await ctx.db.patch(postId, {
      commentsCount: topLevelCount,
    });

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
        q.eq("userId", args.userId).eq("commentId", args.commentId)
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
        q.eq("userId", args.userId).eq("commentId", args.commentId)
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
          q.eq("userId", args.userId).eq("commentId", args.commentId)
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

    const updates: { name?: string; image?: string; headerImage?: string; bio?: string; major?: string; semester?: number; interests?: string[] } = {};
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.image !== undefined) {
      // If image is empty string, set to undefined to delete it
      updates.image = args.image === "" ? undefined : args.image;
    }
    if (args.headerImage !== undefined) {
      // If headerImage is empty string, set to undefined to delete it
      updates.headerImage = args.headerImage === "" ? undefined : args.headerImage;
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
      updates.interests = args.interests.length > 0 ? args.interests : undefined;
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
    if (post.participantLimit && (post.participantsCount ?? 0) >= post.participantLimit) {
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

    return { success: true };
  },
});

export const createConversation = mutation({
  args: {
    participants: v.array(v.id("users")),
    name: v.optional(v.string()), // Optionaler Name für Gruppen
    creatorId: v.optional(v.id("users")), // Add creatorId argument
  },
  handler: async (ctx, args) => {
    const isGroup = args.participants.length > 2 || !!args.name;

    // Nur bei 1:1 Chats prüfen wir auf Duplikate
    if (!isGroup && args.participants.length === 2) {
      const conversations = await ctx.db.query("conversations").collect();
      const existing = conversations.find(c =>
        !c.isGroup &&
        c.participants.includes(args.participants[0]) &&
        c.participants.includes(args.participants[1]) &&
        c.participants.length === 2
      );
      if (existing) return existing._id;
    }

    const conversationId = await ctx.db.insert("conversations", {
      participants: args.participants,
      name: args.name,
      isGroup,
      creatorId: args.creatorId,
      adminIds: args.creatorId ? [args.creatorId] : undefined, // Creator is initially the only admin
      updatedAt: Date.now(),
    });

    return conversationId;
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
      const isAdmin = conversation.adminIds?.includes(args.userId) || conversation.creatorId === args.userId;
      if (!isAdmin) throw new Error("Only admins can change group image");
    }

    await ctx.db.patch(args.conversationId, {
      image: args.imageId === "" ? undefined : args.imageId
    });
  },
});



export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    type: v.optional(v.union(v.literal("text"), v.literal("system"), v.literal("image"), v.literal("pdf"))),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    contentType: v.optional(v.string()),
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
      createdAt: Date.now(),
    });

    // Update conversation: lastMessageId und updatedAt
    await ctx.db.patch(args.conversationId, {
      lastMessageId: messageId,
      updatedAt: Date.now(),
    });

    return messageId;
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

    if (!conversation.isGroup) throw new Error("Can only add members to group chats");

    // Check admin permissions
    const isAdmin = conversation.adminIds?.includes(args.adminId) || conversation.creatorId === args.adminId;
    if (!isAdmin) throw new Error("Only admins can add members");

    if (conversation.participants.includes(args.newMemberId)) {
      throw new Error("User already in group");
    }

    // Add member
    // Add member and remove from leftParticipants if present
    const leftParticipants = conversation.leftParticipants || [];
    const newLeftParticipants = leftParticipants.filter(id => id !== args.newMemberId);

    await ctx.db.patch(args.conversationId, {
      participants: [...conversation.participants, args.newMemberId],
      leftParticipants: newLeftParticipants,
      // Remove from leftMetadata if present
      leftMetadata: (conversation.leftMetadata || []).filter(m => m.userId !== args.newMemberId),
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
    const isAdmin = conversation.adminIds?.includes(args.adminId) || conversation.creatorId === args.adminId;
    if (!isAdmin) throw new Error("Only admins can remove members");

    // Cannot remove creator
    if (args.memberIdToRemove === conversation.creatorId) {
      throw new Error("Cannot remove group creator");
    }

    const newParticipants = conversation.participants.filter(id => id !== args.memberIdToRemove);
    const newAdmins = conversation.adminIds?.filter(id => id !== args.memberIdToRemove);

    // Ensure uniqueness in leftParticipants
    const currentLeft = conversation.leftParticipants || [];
    const newLeftParticipants = currentLeft.includes(args.memberIdToRemove)
      ? currentLeft
      : [...currentLeft, args.memberIdToRemove];

    // Update leftMetadata
    const currentMetadata = conversation.leftMetadata || [];
    // Remove old entry if exists (though unlikely for active member) and add new one
    const newMetadata = [
      ...currentMetadata.filter(m => m.userId !== args.memberIdToRemove),
      { userId: args.memberIdToRemove, leftAt: Date.now() }
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
    if (!conversation) throw new Error("Conversation not found");

    if (!conversation.participants.includes(args.userId)) {
      throw new Error("User not in group");
    }

    // If user is the creator, they must transfer creator status first
    if (conversation.creatorId === args.userId) {
      throw new Error("Creator must transfer creator status before leaving the group");
    }

    const newParticipants = conversation.participants.filter(id => id !== args.userId);
    const newAdmins = conversation.adminIds?.filter(id => id !== args.userId);

    // Ensure uniqueness in leftParticipants
    const currentLeft = conversation.leftParticipants || [];
    const newLeftParticipants = currentLeft.includes(args.userId)
      ? currentLeft
      : [...currentLeft, args.userId];

    // Update leftMetadata
    const currentMetadata = conversation.leftMetadata || [];
    const newMetadata = [
      ...currentMetadata.filter(m => m.userId !== args.userId),
      { userId: args.userId, leftAt: Date.now() }
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
  }
});

export const deleteConversationFromList = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Only allow if user is in leftParticipants
    if (!conversation.leftParticipants?.includes(args.userId)) {
      // Or if they are in participants? If they delete active chat -> implies leaving?
      // User requirement: "after leaving... or being removed... list option to delete".
      // So strict check for leftParticipants is safer.
      throw new Error("Cannot delete active conversation. Leave first.");
    }

    const newLeftParticipants = conversation.leftParticipants.filter(id => id !== args.userId);
    const newMetadata = (conversation.leftMetadata || []).filter(m => m.userId !== args.userId);

    await ctx.db.patch(args.conversationId, {
      leftParticipants: newLeftParticipants,
      leftMetadata: newMetadata,
    });
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

    const isAdmin = conversation.adminIds?.includes(args.adminId) || conversation.creatorId === args.adminId;
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

    const isAdmin = conversation.adminIds?.includes(args.adminId) || conversation.creatorId === args.adminId;
    if (!isAdmin) throw new Error("Only admins can demote members");

    // Cannot demote creator
    if (args.memberIdToDemote === conversation.creatorId) {
      throw new Error("Cannot demote group creator");
    }

    const currentAdmins = conversation.adminIds || [];
    const newAdmins = currentAdmins.filter(id => id !== args.memberIdToDemote);

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

    // If userId is provided and this is a group, check that user is the creator
    if (args.userId && conversation.isGroup) {
      if (conversation.creatorId !== args.userId) {
        throw new Error("Only the group creator can delete the group");
      }
    }

    // 1. Delete all messages associated with the conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // 2. Delete all last_reads associated with the conversation
    const lastReads = await ctx.db
      .query("last_reads")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    for (const read of lastReads) {
      await ctx.db.delete(read._id);
    }

    // 3. Delete the conversation itself
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
        q.eq("userId", args.userId).eq("postId", args.postId)
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

export const deletePost = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Prüfe, ob der Post existiert und dem User gehört
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post nicht gefunden");
    }

    if (post.userId !== args.userId) {
      throw new Error("Nicht berechtigt, diesen Post zu löschen");
    }

    // Lösche alle zugehörigen Daten
    // Likes löschen
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    // Participants löschen
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    for (const participant of participants) {
      await ctx.db.delete(participant._id);
    }

    // Poll Votes löschen
    const pollVotes = await ctx.db
      .query("pollVotes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    for (const vote of pollVotes) {
      await ctx.db.delete(vote._id);
    }

    // Post löschen
    await ctx.db.delete(args.postId);

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
        q.eq("userId", args.userId).eq("conversationId", args.conversationId)
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
      throw new Error("Cannot transfer creator status to a user who has left the group");
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
