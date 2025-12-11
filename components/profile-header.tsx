"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/follow-button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface ProfileHeaderProps {
    name: string;
    image?: string;
    uniName?: string;
    major?: string;
    bio?: string;
    userId: Id<"users">;
    currentUserId?: Id<"users">;
    isOwnProfile?: boolean;
    // Optional preloaded data to prevent flickering
    postsCount?: number;
    followerCount?: number;
    followingCount?: number;
    isFollowing?: boolean;
}

export function ProfileHeader({
    name,
    image,
    uniName,
    major,
    bio,
    userId,
    currentUserId,
    isOwnProfile = false,
    postsCount,
    followerCount: preloadedFollowerCount,
    followingCount: preloadedFollowingCount,
    isFollowing: preloadedIsFollowing,
}: ProfileHeaderProps) {
    // Use preloaded data if available, otherwise query
    const queriedFollowerCount = useQuery(api.queries.getFollowerCount,
        preloadedFollowerCount === undefined && userId ? { userId } : "skip"
    );
    const queriedFollowingCount = useQuery(api.queries.getFollowingCount,
        preloadedFollowingCount === undefined && userId ? { userId } : "skip"
    );

    const followerCount = preloadedFollowerCount ?? queriedFollowerCount;
    const followingCount = preloadedFollowingCount ?? queriedFollowingCount;

    return (
        <div className="flex flex-col items-center pt-6 pb-4 px-4">
            {/* Profile Picture - larger and centered */}
            <Avatar className="w-32 h-32 mb-4">
                <AvatarImage src={image} alt={name} />
                <AvatarFallback className="text-3xl bg-[#000000]/20 text-[#000000]">
                    {name[0].toUpperCase()}
                </AvatarFallback>
            </Avatar>

            {/* Name and Stats - vertically aligned and centered */}
            <div className="flex flex-col items-center mb-4 w-full">
                {/* Name - centered */}
                <h1 className="text-xl font-semibold text-[#000000] mb-5 text-center">{name}</h1>

                {/* Statistics - centered as a group, not stretched */}
                <div className="flex justify-center items-center gap-6 sm:gap-8">
                    {/* Post Stat */}
                    <div className="flex flex-col items-center justify-center w-[70px] sm:w-[80px]">
                        <div className="text-lg sm:text-xl font-bold text-[#000000] leading-tight text-center w-full">
                            {postsCount ?? 0}
                        </div>
                        <div className="text-xs sm:text-sm text-[#000000]/60 font-normal mt-0.5 text-center w-full">
                            {(postsCount ?? 0) === 1 ? "Post" : "Posts"}
                        </div>
                    </div>

                    {/* Follower Stat */}
                    <div className="flex flex-col items-center justify-center w-[70px] sm:w-[80px]">
                        <div className="text-lg sm:text-xl font-bold text-[#000000] leading-tight text-center w-full">
                            {followerCount ?? 0}
                        </div>
                        <div className="text-xs sm:text-sm text-[#000000]/60 font-normal mt-0.5 text-center w-full">
                            Follower
                        </div>
                    </div>

                    {/* Following Stat */}
                    <div className="flex flex-col items-center justify-center w-[70px] sm:w-[80px]">
                        <div className="text-lg sm:text-xl font-bold text-[#000000] leading-tight text-center w-full">
                            {followingCount ?? 0}
                        </div>
                        <div className="text-xs sm:text-sm text-[#000000]/60 font-normal mt-0.5 text-center w-full">
                            Following
                        </div>
                    </div>
                </div>
            </div>

            {/* Bio - centered below stats */}
            {bio && bio.trim() !== "" && (
                <p className="whitespace-pre-wrap text-[14px] leading-[1.6] text-black text-center px-4 max-w-md mb-4">
                    {bio}
                </p>
            )}

            {/* Follow button (hidden on own profile) */}
            {!isOwnProfile && (
                <FollowButton
                    currentUserId={currentUserId}
                    targetUserId={userId}
                    preloadedIsFollowing={preloadedIsFollowing}
                />
            )}
        </div>
    );
}
