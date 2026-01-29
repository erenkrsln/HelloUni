"use client";

import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Avatar } from "@/components/ui/avatar";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { profileCache } from "@/lib/cache/profileCache";

interface NotificationItemProps {
    notification: {
        _id: Id<"notifications">;
        type: "follow" | "post_like" | "comment" | "comment_like" | "event_join";
        isRead: boolean;
        createdAt: number;
        issuer: {
            _id: Id<"users">;
            name: string;
            username: string;
            avatarUrl: string | null;
            isFollowing: boolean;
        };
        target?: {
            type: string;
            postId?: Id<"posts">;
            commentId?: Id<"comments">;
            thumbnail?: string | null;
            snippet?: string;
            eventType?: "spontaneous_meeting" | "recurring_meeting";
            title?: string;
        } | null;
        eventMetadata?: {
            eventType: "spontaneous_meeting" | "recurring_meeting";
        };
    };
    currentUserId: Id<"users">;
}

export function NotificationItem({ notification, currentUserId }: NotificationItemProps) {
    const markAsRead = useMutation(api.notifications.markAsRead);
    const followUser = useMutation(api.mutations.followUser);
    const unfollowUser = useMutation(api.mutations.unfollowUser);

    const [isFollowing, setIsFollowing] = useState(notification.issuer.isFollowing);
    const [isLoading, setIsLoading] = useState(false);

    // Sync state if prop changes (e.g. revalidation)
    useEffect(() => {
        setIsFollowing(notification.issuer.isFollowing);
    }, [notification.issuer.isFollowing]);

    const handleClick = () => {
        if (!notification.isRead) {
            markAsRead({
                notificationId: notification._id,
                userId: currentUserId,
            });
        }
    };

    const handleFollowToggle = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent navigation to profile
        e.stopPropagation();

        if (isLoading) return;
        setIsLoading(true);

        const newStatus = !isFollowing;
        setIsFollowing(newStatus); // Optimistic update

        // Update profile cache to prevent flicker when navigating to profile
        try {
            const cacheKey = profileCache.getKey(notification.issuer.username, currentUserId);
            // We use the internal cache map directly if needed, but the public get() handles expiration
            // Since we're here, we might want to ensure we don't accidentally expire it just by checking,
            // but get() is fine.
            const cachedData = profileCache.get(cacheKey);

            if (cachedData) {
                profileCache.set(cacheKey, {
                    ...cachedData,
                    isFollowing: newStatus,
                    followerCount: newStatus
                        ? cachedData.followerCount + 1
                        : Math.max(0, cachedData.followerCount - 1)
                });
            }
        } catch (e) {
            console.error("Failed to update profile cache", e);
        }

        try {
            if (newStatus) {
                await followUser({
                    followerId: currentUserId,
                    followingId: notification.issuer._id,
                });
            } else {
                await unfollowUser({
                    followerId: currentUserId,
                    followingId: notification.issuer._id,
                });
            }
        } catch (error) {
            console.error("Failed to toggle follow status:", error);
            setIsFollowing(!newStatus); // Revert on error
        } finally {
            setIsLoading(false);
        }
    };

    // Generate notification text
    const getNotificationText = () => {
        const issuerName = notification.issuer.username;
        switch (notification.type) {
            case "follow":
                return (
                    <>
                        <span className="font-semibold">{issuerName}</span> folgt dir jetzt.
                    </>
                );
            case "post_like":
                return (
                    <>
                        <span className="font-semibold">{issuerName}</span> hat deinen Beitrag geliked.
                    </>
                );
            case "comment":
                return (
                    <>
                        <span className="font-semibold">{issuerName}</span> hat kommentiert: {notification.target?.snippet}
                    </>
                );
            case "comment_like":
                return (
                    <>
                        <span className="font-semibold">{issuerName}</span> hat deinen Kommentar geliked.
                    </>
                );
            case "event_join":
                return (
                    <>
                        <span className="font-semibold">{issuerName}</span> nimmt an deinem Event teil.
                    </>
                );
            default:
                return <span className="font-semibold">{issuerName}</span>;
        }
    };

    // Generate link based on notification type
    const getLink = () => {
        const baseUrl = (() => {
            if (notification.type === "follow") {
                return `/profile/${notification.issuer.username}`;
            }
            if (notification.target?.type === "event") {
                return `/events/${notification.target.postId}`;
            }
            if (notification.type === "comment" && notification.target?.commentId) {
                return `/posts/${notification.target.postId}?commentId=${notification.target.commentId}`;
            }
            if (notification.target?.postId) {
                return `/posts/${notification.target.postId}`;
            }
            return "/home";
        })();

        // Add notification ID for marking as read on the target page
        const separator = baseUrl.includes("?") ? "&" : "?";
        return `${baseUrl}${separator}notiId=${notification._id}`;
    };

    // Custom short time format
    const getTimeString = () => {
        const date = new Date(notification.createdAt);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} Std.`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} Tg.`;
        return `${Math.floor(diffInSeconds / 604800)} Wo.`;
    };

    return (
        <Link
            href={getLink()}
            className="flex items-center justify-between w-full p-4 transition-colors"
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Left: Avatar */}
                <div className="relative flex-shrink-0">
                    <Avatar className="w-11 h-11 border border-gray-100">
                        {notification.issuer.avatarUrl ? (
                            <img
                                src={notification.issuer.avatarUrl}
                                alt={notification.issuer.username}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 font-medium text-sm">
                                {notification.issuer.username.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </Avatar>
                </div>

                {/* Center: Text */}
                <div className="flex flex-col flex-1 min-w-0 mr-3">
                    <span className="text-[14px] leading-[18px] text-[#262626]">
                        {getNotificationText()}
                        <span className="text-[#8e8e8e] ml-1 font-normal">
                            {getTimeString()}
                        </span>
                    </span>
                </div>
            </div>

            {/* Right: Thumbnail, Follow Button or Unread Indicator */}
            <div className="flex items-center gap-3 flex-shrink-0 ml-1">
                {notification.type === "follow" ? (
                    <button
                        onClick={handleFollowToggle}
                        disabled={isLoading}
                        className={`
                            text-sm font-medium transition-all cursor-pointer px-3 py-2 rounded-full whitespace-nowrap flex-shrink-0
                            ${isFollowing
                                ? "bg-gray-100 text-red-500 hover:opacity-80"
                                : "bg-[#D08945] text-white hover:opacity-80"
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                        style={{ minWidth: "85px" }}
                    >
                        {isFollowing ? "Entfolgen" : "Folgen"}
                    </button>
                ) : (
                    <>
                        {!notification.isRead && (
                            <div className="w-2 h-2 bg-[#0095F6] rounded-full" />
                        )}
                        {notification.target?.thumbnail && (
                            <img
                                src={notification.target.thumbnail}
                                alt="Preview"
                                className="w-10 h-10 aspect-square object-cover rounded-[4px] border border-gray-100"
                            />
                        )}
                    </>
                )}
            </div>
        </Link>
    );
}
