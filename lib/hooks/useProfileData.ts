import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useProfileVisitTracking } from "./useProfileVisitTracking";

interface UseProfileDataOptions {
  username?: string;
  userId?: Id<"users">;
}

interface UseProfileDataResult {
  user: {
    _id: Id<"users">;
    name: string;
    username?: string;
    image?: string;
    uni_name?: string;
    major?: string;
  } | null | undefined;
  userPosts: Array<{
    _id: Id<"posts">;
    userId: Id<"users">;
    content: string;
    imageUrl?: string;
    likesCount: number;
    commentsCount: number;
    createdAt: number;
    user: {
      _id: Id<"users">;
      name: string;
      username?: string;
      image?: string;
      uni_name?: string;
      major?: string;
    } | null;
  }>;
  allPosts: any[] | undefined;
  isLoading: boolean;
  isFirstVisit: boolean;
  error: "not_found" | null;
}

/**
 * Reusable hook for fetching profile data with intelligent caching
 * 
 * Features:
 * - Automatic caching via Convex useQuery
 * - First-visit tracking to show loading spinner only once
 * - Background updates of stale data
 * - Works with both username and userId
 * 
 * @param options - Either username or userId must be provided
 * @returns Profile data, loading states, and error information
 */
export function useProfileData(options: UseProfileDataOptions): UseProfileDataResult {
  const { username, userId } = options;
  
  if (!username && !userId) {
    throw new Error("useProfileData: Either username or userId must be provided");
  }

  // Use username or userId as profile identifier for visit tracking
  const profileId = username || userId || "";
  const { isFirstVisit } = useProfileVisitTracking(profileId);

  // Fetch user data - Convex automatically caches this
  const user = useQuery(
    api.queries.getUserByUsername,
    username ? { username } : "skip"
  );

  // Also try userId if username query didn't work and userId is provided
  const userById = useQuery(
    api.queries.getUserById,
    userId && !username ? { userId } : "skip"
  );

  // Get all posts (cached by Convex)
  const allPosts = useQuery(api.queries.getFeed);

  // Determine which user data to use
  // If username query is used, prefer that; otherwise use userId query
  const resolvedUser = username ? user : (userById ?? user);

  // Filter posts by user
  const userPosts = resolvedUser
    ? allPosts?.filter((post) => post.userId === resolvedUser._id) || []
    : [];

  // Determine loading state
  // Only show loading on first visit when data is actually undefined
  // On subsequent visits, Convex cache provides data immediately
  const isLoading = isFirstVisit && (resolvedUser === undefined || allPosts === undefined);

  // Determine error state
  // Only set error if query has completed (user is null, not undefined) AND we're not loading
  // user === null means the query completed but found nothing
  // user === undefined means the query is still loading
  // Check if the relevant query has completed (not undefined)
  const queryCompleted = username 
    ? user !== undefined  // username query has completed
    : userById !== undefined; // userId query has completed
  
  const error = !isLoading && queryCompleted && resolvedUser === null ? "not_found" : null;

  return {
    user: resolvedUser,
    userPosts,
    allPosts,
    isLoading,
    isFirstVisit,
    error,
  };
}

