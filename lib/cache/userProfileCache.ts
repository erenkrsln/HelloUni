import { Id } from "@/convex/_generated/dataModel";

/**
 * User Profile type matching the structure returned from Convex
 */
export interface UserProfile {
  _id: Id<"users">;
  name: string;
  username?: string;
  image?: string;
  uni_name?: string;
  major?: string;
}

/**
 * In-memory cache for user profiles
 * 
 * This cache persists for the duration of the browser session.
 * It allows instant display of previously loaded profiles without
 * showing loading spinners on subsequent visits.
 * 
 * The cache is automatically updated when Convex queries return
 * fresh data, ensuring the UI always shows the latest information.
 */
class UserProfileCache {
  private cache = new Map<string, UserProfile>();

  /**
   * Get cached profile by username or userId
   */
  get(key: string): UserProfile | undefined {
    return this.cache.get(key);
  }

  /**
   * Set cached profile by username or userId
   */
  set(key: string, profile: UserProfile): void {
    this.cache.set(key, profile);
  }

  /**
   * Check if profile is cached
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear cache (useful for testing or logout)
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache key for a user
   * Uses username if available, otherwise userId
   */
  static getKey(username?: string, userId?: Id<"users">): string {
    return username || userId || "";
  }
}

// Export singleton instance
export const userProfileCache = new UserProfileCache();

// Export class for static method access
export { UserProfileCache };

