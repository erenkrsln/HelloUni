import { useState, useEffect, useRef } from "react";

/**
 * Custom hook to track if a profile has been visited before
 * Uses sessionStorage to persist visit state across navigation
 * 
 * @param profileId - Unique identifier for the profile (e.g., username or userId)
 * @returns Object with isFirstVisit flag
 */
export function useProfileVisitTracking(profileId: string) {
  const storageKey = `profile_visited_${profileId}`;
  const hasInitialized = useRef(false);

  // Initialize synchronously to prevent flash of loading state
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    if (typeof window === "undefined") return true;
    const visited = sessionStorage.getItem(storageKey);
    return !visited;
  });

  // Update when profileId changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const visited = sessionStorage.getItem(storageKey);
    setIsFirstVisit(!visited);
  }, [profileId, storageKey]);

  // Mark as visited after initial render to prevent immediate re-render
  useEffect(() => {
    if (typeof window === "undefined" || hasInitialized.current) return;
    
    if (isFirstVisit) {
      // Small delay to ensure data has loaded before marking as visited
      const timer = setTimeout(() => {
        sessionStorage.setItem(storageKey, "true");
        setIsFirstVisit(false);
        hasInitialized.current = true;
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      hasInitialized.current = true;
    }
  }, [isFirstVisit, storageKey]);

  return { isFirstVisit };
}





















