"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
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
        <Button
            onClick={handleFollowToggle}
            disabled={isLoading || isFollowing === undefined}
            className={`
                h-10 px-6 rounded-full font-semibold transition-all duration-200 shadow-sm flex-shrink-0 min-w-[100px]
                ${isFollowing
                    ? "!bg-none !bg-[#261708] !border !border-[#EED6B5] !text-[#EED6B5] hover:!bg-[#261708]/80 !shadow-none"
                    : "bg-[#D08945] text-white hover:bg-[#C07835]"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
            `}
        >
            {isFollowing ? "Gefolgt" : "Folgen"}
        </Button>
    );
}
