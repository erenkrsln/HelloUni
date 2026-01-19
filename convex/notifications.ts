import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Get all notifications for the current user
 * Returns notifications with issuer details and target information
 */
export const get = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        // Fetch all notifications for the user, ordered by newest first
        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
            .order("desc")
            .collect();

        // Enrich notifications with issuer and target data
        const enrichedNotifications = await Promise.all(
            notifications.map(async (notification) => {
                // Get issuer user data
                const issuer = await ctx.db.get(notification.issuerId);
                if (!issuer) return null;

                // Resolve issuer avatar URL if exists
                let issuerAvatarUrl = null;
                if (issuer.image) {
                    try {
                        issuerAvatarUrl = await ctx.storage.getUrl(issuer.image as Id<"_storage">);
                    } catch {
                        issuerAvatarUrl = null;
                    }
                }

                // Get target data based on notification type
                let targetData = null;
                if (notification.targetId) {
                    if (notification.type === "post_like") {
                        const post = await ctx.db.get(notification.targetId as Id<"posts">);
                        if (post) {
                            let thumbnailUrl = null;
                            if (post.imageUrl) {
                                try {
                                    thumbnailUrl = await ctx.storage.getUrl(post.imageUrl as Id<"_storage">);
                                } catch {
                                    thumbnailUrl = null;
                                }
                            }
                            targetData = {
                                type: "post",
                                postId: post._id,
                                thumbnail: thumbnailUrl,
                                content: post.content?.substring(0, 50),
                            };
                        }
                    } else if (notification.type === "comment") {
                        const comment = await ctx.db.get(notification.targetId as Id<"comments">);
                        if (comment) {
                            const post = await ctx.db.get(comment.postId);
                            let thumbnailUrl = null;
                            if (post?.imageUrl) {
                                try {
                                    thumbnailUrl = await ctx.storage.getUrl(post.imageUrl as Id<"_storage">);
                                } catch {
                                    thumbnailUrl = null;
                                }
                            }
                            targetData = {
                                type: "comment",
                                commentId: comment._id,
                                postId: comment.postId,
                                snippet: comment.content.substring(0, 50),
                                thumbnail: thumbnailUrl,
                            };
                        }
                    } else if (notification.type === "comment_like") {
                        const comment = await ctx.db.get(notification.targetId as Id<"comments">);
                        if (comment) {
                            const post = await ctx.db.get(comment.postId);
                            let thumbnailUrl = null;
                            if (post?.imageUrl) {
                                try {
                                    thumbnailUrl = await ctx.storage.getUrl(post.imageUrl as Id<"_storage">);
                                } catch {
                                    thumbnailUrl = null;
                                }
                            }
                            targetData = {
                                type: "comment",
                                commentId: comment._id,
                                postId: comment.postId,
                                snippet: comment.content.substring(0, 50),
                                thumbnail: thumbnailUrl,
                            };
                        }
                    } else if (notification.type === "event_join") {
                        const post = await ctx.db.get(notification.targetId as Id<"posts">);
                        if (post) {
                            let thumbnailUrl = null;
                            if (post.imageUrl) {
                                try {
                                    thumbnailUrl = await ctx.storage.getUrl(post.imageUrl as Id<"_storage">);
                                } catch {
                                    thumbnailUrl = null;
                                }
                            }
                            targetData = {
                                type: "event",
                                postId: post._id,
                                eventType: notification.eventMetadata?.eventType,
                                title: post.title,
                                thumbnail: thumbnailUrl,
                            };
                        }
                    }
                }

                // Check if current user follows the issuer
                const isFollowing = await ctx.db
                    .query("follows")
                    .withIndex("by_follower_following", (q) =>
                        q.eq("followerId", args.userId).eq("followingId", issuer._id)
                    )
                    .first();

                return {
                    _id: notification._id,
                    type: notification.type,
                    isRead: notification.isRead,
                    createdAt: notification.createdAt,
                    issuer: {
                        _id: issuer._id,
                        name: issuer.name,
                        username: issuer.username,
                        avatarUrl: issuerAvatarUrl,
                        isFollowing: !!isFollowing,
                    },
                    target: targetData,
                    eventMetadata: notification.eventMetadata,
                };
            })
        );

        // Filter out null values (where issuer was deleted)
        const validNotifications = enrichedNotifications.filter((n) => n !== null);

        // Calculate counts
        const unreadCount = validNotifications.filter((n) => !n.isRead).length;

        return {
            notifications: validNotifications,
            totalCount: validNotifications.length,
            unreadCount,
        };
    },
});

/**
 * Mark a notification as read
 */
export const markAsRead = mutation({
    args: {
        notificationId: v.id("notifications"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const notification = await ctx.db.get(args.notificationId);

        if (!notification) {
            throw new Error("Notification not found");
        }

        // Verify ownership
        if (notification.userId !== args.userId) {
            throw new Error("Not authorized to update this notification");
        }

        await ctx.db.patch(args.notificationId, {
            isRead: true,
        });

        return { success: true };
    },
});

/**
 * Create a new notification
 * Internal mutation called by other mutations
 */
export const create = mutation({
    args: {
        userId: v.id("users"),
        issuerId: v.id("users"),
        type: v.union(
            v.literal("follow"),
            v.literal("post_like"),
            v.literal("comment"),
            v.literal("comment_like"),
            v.literal("event_join")
        ),
        targetId: v.optional(v.string()),
        eventMetadata: v.optional(v.object({
            eventType: v.union(
                v.literal("spontaneous_meeting"),
                v.literal("recurring_meeting")
            ),
        })),
    },
    handler: async (ctx, args) => {
        // Prevent self-notifications
        if (args.userId === args.issuerId) {
            return { success: false, reason: "Cannot notify self" };
        }

        // Check for recent duplicate notifications to avoid spam
        // Only check for duplicates in the last 5 minutes
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const recentNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
            .filter((q) => q.gte(q.field("createdAt"), fiveMinutesAgo))
            .collect();

        const duplicate = recentNotifications.find(
            (n) =>
                n.issuerId === args.issuerId &&
                n.type === args.type &&
                n.targetId === args.targetId
        );

        if (duplicate) {
            return { success: false, reason: "Duplicate notification" };
        }

        // Create the notification
        const notificationId = await ctx.db.insert("notifications", {
            userId: args.userId,
            issuerId: args.issuerId,
            type: args.type,
            targetId: args.targetId,
            eventMetadata: args.eventMetadata,
            isRead: false,
            createdAt: Date.now(),
        });

        return { success: true, notificationId };
    },
});
