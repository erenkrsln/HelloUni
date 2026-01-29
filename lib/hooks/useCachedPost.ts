import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { postCache } from "@/lib/cache/postCache";
import { useEffect, useState } from "react";

interface UseCachedPostOptions {
    postId: Id<"posts">;
    currentUserId?: Id<"users">;
}

export function useCachedPost({ postId, currentUserId }: UseCachedPostOptions) {
    const cacheKey = postCache.getKey(postId, currentUserId);

    // 1. Initial State from Cache
    const [cachedData, setCachedData] = useState<any>(() => {
        const entry = postCache.get(cacheKey);
        return entry?.post;
    });

    // 2. Convex Query
    const post = useQuery(api.queries.getPost, {
        postId,
        userId: currentUserId ?? undefined
    });

    // 3. Sync Logic: When query resolves, update cache
    useEffect(() => {
        if (post !== undefined && post !== null) {
            postCache.set(cacheKey, post);

            // Update local state only if content has changed meaningfully
            // Simple string comparison for now as it's a flat-ish object
            if (JSON.stringify(post) !== JSON.stringify(cachedData)) {
                setCachedData(post);
            }
        }
    }, [post, cacheKey, cachedData]);

    // 4. Return Data
    // Priority: Cache -> Resolved (Fresh) -> Loading
    const finalData = cachedData ?? post;
    const isLoading = post === undefined && !cachedData;

    return {
        post: finalData,
        isLoading,
        notFound: post === null && !cachedData,
    };
}
