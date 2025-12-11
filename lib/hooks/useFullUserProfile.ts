import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { profileCache, ProfileData } from "@/lib/cache/profileCache";
import { useEffect, useState, useMemo } from "react";

interface useFullUserProfileOptions {
    username: string;
    currentUserId?: Id<"users">;
}

export function useFullUserProfile({ username, currentUserId }: useFullUserProfileOptions) {
    const cacheKey = profileCache.getKey(username, currentUserId);

    // 1. Initial State from Cache
    const [cachedData, setCachedData] = useState<ProfileData | undefined>(() =>
        profileCache.get(cacheKey)
    );

    // 2. Conver Parallel Queries
    const user = useQuery(api.queries.getUserByUsername, { username });

    const userId = user?._id;

    const followerCount = useQuery(api.queries.getFollowerCount,
        userId ? { userId } : "skip"
    );

    const followingCount = useQuery(api.queries.getFollowingCount,
        userId ? { userId } : "skip"
    );

    const isFollowing = useQuery(api.queries.isFollowing,
        userId && currentUserId ? { followerId: currentUserId, followingId: userId } : "skip"
    );

    // 3. Sync Logic: When all queries resolve, update cache
    const dataReady = user !== undefined &&
        followerCount !== undefined &&
        followingCount !== undefined &&
        (currentUserId ? isFollowing !== undefined : true);

    const resolvedData: ProfileData | undefined = useMemo(() => {
        if (!dataReady || !user) return undefined;
        return {
            user: {
                _id: user._id,
                name: user.name,
                image: user.image,
                uni_name: user.uni_name,
                major: user.major,
                bio: (user as any).bio,
            },
            followerCount,
            followingCount,
            isFollowing: isFollowing ?? false,
            timestamp: Date.now()
        };
    }, [dataReady, user, followerCount, followingCount, isFollowing, currentUserId]);

    useEffect(() => {
        if (resolvedData) {
            profileCache.set(cacheKey, resolvedData);
            // Update local state only if different (deep check or just key check - simplifed here)
            if (JSON.stringify(resolvedData.user) !== JSON.stringify(cachedData?.user) ||
                resolvedData.followerCount !== cachedData?.followerCount ||
                resolvedData.isFollowing !== cachedData?.isFollowing) {
                setCachedData(resolvedData);
            }
        }
    }, [resolvedData, cacheKey]); // cachedData dependency removed to avoid loops, relying on effect trigged by resolvedData change

    // 4. Return Data
    // Priority: Cache -> Resolved (Fresh) -> Loading

    const finalData = cachedData ?? resolvedData;
    const isLoading = !finalData;
    // Note: if finalData exists (cache), we are NOT loading from UI perspective.
    // The hooks run in background and update cache/state when ready.

    return {
        data: finalData,
        isLoading,
        notFound: dataReady && !user && !cachedData, // User really not found
    };
}
