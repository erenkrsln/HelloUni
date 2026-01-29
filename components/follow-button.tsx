"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

interface FollowButtonProps {
    currentUserId: Id<"users"> | undefined;
    targetUserId: Id<"users">;
    preloadedIsFollowing?: boolean;
}

export function FollowButton({ currentUserId, targetUserId, preloadedIsFollowing }: FollowButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    // Use preloaded data if available, otherwise query
    const queriedIsFollowing = useQuery(
        api.queries.isFollowing,
        preloadedIsFollowing === undefined && currentUserId
            ? { followerId: currentUserId, followingId: targetUserId }
            : "skip"
    );

    const isFollowing = preloadedIsFollowing ?? queriedIsFollowing;

    const followUser = useMutation(api.mutations.followUser);
    const unfollowUser = useMutation(api.mutations.unfollowUser);

    const handleFollowToggle = async () => {
        if (!currentUserId) return;

        setIsLoading(true);
        try {
            if (isFollowing) {
                await unfollowUser({
                    followerId: currentUserId,
                    followingId: targetUserId,
                });
            } else {
                await followUser({
                    followerId: currentUserId,
                    followingId: targetUserId,
                });
            }
        } catch (error) {
            console.error("Error toggling follow:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Don't show button if not logged in or viewing own profile
    if (!currentUserId || currentUserId === targetUserId) {
        return null;
    }

    return (
        <button
            onClick={handleFollowToggle}
            disabled={isLoading || isFollowing === undefined}
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
            {isFollowing === undefined ? (
                <span className="opacity-0">Folgen</span> // Invisible placeholder to keep width
            ) : isFollowing ? (
                "Entfolgen"
            ) : (
                "Folgen"
            )}
        </button>
    );
}
