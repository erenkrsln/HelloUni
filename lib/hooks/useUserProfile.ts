import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { userProfileCache, UserProfile, UserProfileCache } from "@/lib/cache/userProfileCache";
import { useEffect, useState, useMemo } from "react";

interface UseUserProfileOptions {
  username?: string;
  userId?: Id<"users">;
}

interface UseUserProfileResult {
  user: UserProfile | null | undefined;
  isLoading: boolean;
  error: "not_found" | null;
}

/**
 * Custom hook for fetching user profile data with intelligent caching
 * 
 * Behavior:
 * - First visit: Shows loading spinner while fetching from Convex
 * - Subsequent visits: Returns cached data immediately, refreshes in background
 * 
 * How it works:
 * 1. On first call, checks cache - if empty, shows loading state
 * 2. useQuery fetches data from Convex (or returns cached Convex data)
 * 3. When data arrives, updates both local cache and component state
 * 4. On subsequent visits, cached data is returned immediately
 * 5. useQuery still runs in background to refresh stale data silently
 * 
 * @param options - Either username or userId must be provided
 * @returns User profile data, loading state, and error information
 */
export function useUserProfile(options: UseUserProfileOptions): UseUserProfileResult {
  const { username, userId } = options;

  if (!username && !userId) {
    throw new Error("useUserProfile: Either username or userId must be provided");
  }

  // Get cache key for this user
  const cacheKey = UserProfileCache.getKey(username, userId);

  // Get initial cached data (if available)
  const [cachedData, setCachedData] = useState<UserProfile | undefined>(() => {
    return userProfileCache.get(cacheKey);
  });

  // Fetch user data from Convex
  // This will use Convex's built-in cache and also fetch fresh data in background
  const userFromQuery = useQuery(
    api.queries.getUserByUsername,
    username ? { username } : "skip"
  );

  // Also try userId query if username query is skipped
  const userByIdFromQuery = useQuery(
    api.queries.getUserById,
    userId && !username ? { userId } : "skip"
  );

  // Determine which user data to use from queries
  const resolvedUser = username ? userFromQuery : (userByIdFromQuery ?? userFromQuery);

  // Update cache when new data arrives from Convex
  useEffect(() => {
    if (resolvedUser && resolvedUser !== null) {
      // Update cache with fresh data
      userProfileCache.set(cacheKey, resolvedUser);
      // Update local state if it changed
      if (cachedData !== resolvedUser) {
        setCachedData(resolvedUser);
      }
    }
  }, [resolvedUser, cacheKey, cachedData]);

  // Determine the user to return
  // Priority: 1) Fresh data from query, 2) Cached data, 3) null/undefined
  const user = useMemo(() => {
    // If query has returned data (even if null), use that
    if (resolvedUser !== undefined) {
      return resolvedUser;
    }
    // Otherwise, use cached data if available
    return cachedData;
  }, [resolvedUser, cachedData]);

  // Determine loading state
  // Only show loading if:
  // 1. We don't have cached data AND
  // 2. Query hasn't returned yet (undefined)
  // This ensures spinner only shows on first visit, not on subsequent visits
  // On subsequent visits, cachedData exists, so isLoading = false even if query is still loading
  const isLoading = !cachedData && resolvedUser === undefined;

  // Determine error state
  // Only show error if query completed (not undefined) and user is null
  // We check resolvedUser (from query) not the final user (which might be from cache)
  const queryCompleted = resolvedUser !== undefined;
  const error = queryCompleted && resolvedUser === null ? "not_found" : null;

  return {
    user: user ?? null,
    isLoading,
    error,
  };
}

