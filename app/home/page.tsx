"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FeedCard } from "@/components/feed-card";
import { FeedCardSkeleton } from "@/components/feed-card-skeleton";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Loader2 } from "lucide-react";

// Funktion zur Erkennung mobiler Geräte
const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || (window.matchMedia && window.matchMedia("(max-width: 768px)").matches);
};

import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

/**
 * Hauptseite (geschützt) - Posts-Feed mit optimiertem Infinite Scroll
 * 
 * Optimierungen:
 * - usePaginatedQuery für effizientes Laden
 * - Infinite Loop Prevention mit status === "CanLoadMore"
 * - Debouncing für Scroll-Trigger
 * - Memory Management
 * - Layout Stability mit Skeletons
 */
export default function Home() {
  const router = useRouter();
  const { session, currentUserId, currentUser } = useCurrentUser();
  const [feedType, setFeedType] = useState<"all" | "major" | "following" | "interests">("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Refs für Memory Management und Debouncing
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadMoreInProgressRef = useRef(false); // Verhindert Infinite Loops

  // Prüfe, ob es ein mobiles Gerät ist
  useEffect(() => {
    setIsMobile(isMobileDevice());

    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Get current user's major and interests for filtering
  const currentUserMajor = currentUser ? (currentUser as any)?.major : undefined;
  const currentUserInterests = currentUser ? ((currentUser as any)?.interests || []) : undefined;

  // Buttons nur disable wenn User geladen ist und tatsächlich keine Daten hat
  const isMajorDisabled = currentUser !== undefined && !currentUserMajor;
  const isInterestsDisabled = currentUser !== undefined && (!currentUserInterests || currentUserInterests.length === 0);

  // Manuelle Pagination State
  const [cursor, setCursor] = useState<string | null>(null);
  const [allLoadedPosts, setAllLoadedPosts] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // useQuery für "all" Feed mit manueller Pagination
  const initialNumItems = isMobile ? 10 : 20;
  const feedPage = useQuery(
    api.queries.getFeedPaginated,
    feedType === "all" && currentUserId
      ? {
          userId: currentUserId,
          numItems: cursor ? initialNumItems : initialNumItems, // Initial load oder next page
          cursor: cursor || undefined,
        }
      : "skip"
  );

  // Update loaded posts when new page arrives
  useEffect(() => {
    if (feedPage && feedType === "all") {
      if (cursor === null) {
        // Initial load
        setAllLoadedPosts(feedPage.page || []);
        setIsDone(feedPage.isDone || false);
      } else {
        // Append new posts
        setAllLoadedPosts((prev) => [...prev, ...(feedPage.page || [])]);
        setIsDone(feedPage.isDone || false);
      }
      setIsLoadingMore(false);
    }
  }, [feedPage, cursor, feedType]);

  // Reset when feed type changes
  useEffect(() => {
    setCursor(null);
    setAllLoadedPosts([]);
    setIsDone(false);
    setIsLoadingMore(false);
  }, [feedType]);

  // Load more function
  const loadMore = useCallback(() => {
    if (isLoadingMore || isDone || !feedPage?.continueCursor) return;
    
    setIsLoadingMore(true);
    setCursor(feedPage.continueCursor);
  }, [isLoadingMore, isDone, feedPage?.continueCursor]);

  const allPosts = feedType === "all" ? allLoadedPosts : undefined;
  const postsStatus = feedType === "all" 
    ? (isDone ? "Exhausted" : feedPage?.continueCursor ? "CanLoadMore" : "LoadingFirstPage")
    : "Exhausted";

  // Zum Login umleiten, wenn nicht authentifiziert
  useEffect(() => {
    if (session === null) {
      router.push("/");
    }
  }, [session, router]);

  // Upload Progress Tracking
  useEffect(() => {
    const checkProgress = () => {
      const progress = sessionStorage.getItem("uploadProgress");
      if (progress) {
        setUploadProgress(parseInt(progress));
      } else {
        setUploadProgress(null);
      }
    };

    checkProgress();
    const interval = setInterval(checkProgress, 100);
    return () => clearInterval(interval);
  }, []);

  // Debounced loadMore Funktion - verhindert mehrfaches Laden
  const debouncedLoadMore = useCallback(() => {
    // Clear existing timeout
    if (loadMoreTimeoutRef.current) {
      clearTimeout(loadMoreTimeoutRef.current);
    }

    // Prüfe ob bereits ein Load in Progress ist
    if (isLoadMoreInProgressRef.current) {
      return;
    }

    // Prüfe Status - nur laden wenn "CanLoadMore"
    if (postsStatus !== "CanLoadMore") {
      return;
    }

    // Setze Flag
    isLoadMoreInProgressRef.current = true;

    // Debounce: Warte 300ms bevor loadMore aufgerufen wird
    loadMoreTimeoutRef.current = setTimeout(() => {
      if (feedType === "all") {
        loadMore();
      }
      
      // Reset Flag nach kurzer Verzögerung
      setTimeout(() => {
        isLoadMoreInProgressRef.current = false;
      }, 500);
    }, 300);
  }, [postsStatus, feedType, loadMore]);

  // Intersection Observer für Infinite Scroll mit Memory Management
  useEffect(() => {
    // Cleanup vorheriger Observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    // Nur Observer erstellen wenn Status "CanLoadMore" ist und Sentinel existiert
    if (postsStatus !== "CanLoadMore") {
      return;
    }

    // Warte kurz, damit Sentinel gerendert wird
    const timeoutId = setTimeout(() => {
      if (!sentinelRef.current) {
        return;
      }

      // Erstelle neuen Observer
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && postsStatus === "CanLoadMore") {
              debouncedLoadMore();
            }
          });
        },
        {
          rootMargin: "200px", // Starte Ladevorgang 200px vor dem Viewport
          threshold: 0.1,
        }
      );

      // Beobachte Sentinel
      if (sentinelRef.current) {
        observerRef.current.observe(sentinelRef.current);
      }
    }, 100);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
        loadMoreTimeoutRef.current = null;
      }
    };
  }, [postsStatus, debouncedLoadMore]);

  // Reset loadMore Flag wenn Feed-Type sich ändert
  useEffect(() => {
    isLoadMoreInProgressRef.current = false;
    if (loadMoreTimeoutRef.current) {
      clearTimeout(loadMoreTimeoutRef.current);
      loadMoreTimeoutRef.current = null;
    }
  }, [feedType]);

  // Posts für Rendering
  const posts = allPosts || [];
  const isLoading = feedType === "all" && feedPage === undefined && allLoadedPosts.length === 0;
  const canLoadMore = postsStatus === "CanLoadMore";
  const isLoadingMoreState = isLoadingMore || postsStatus === "LoadingFirstPage";

  return (
    <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 header-spacing overflow-x-hidden">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="px-4 mb-4">
        {/* Feed Filter Links */}
        <div className="flex items-center justify-center gap-2 mb-4 mt-4 flex-nowrap overflow-x-auto">
          <button
            onClick={() => setFeedType("all")}
            className={`text-sm font-medium transition-all cursor-pointer px-3 py-2 rounded-full whitespace-nowrap flex-shrink-0 ${
              feedType === "all"
                ? "bg-[#D08945] text-white"
                : "bg-gray-100 text-gray-700 hover:opacity-80"
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFeedType("major")}
            disabled={isMajorDisabled}
            className={`text-sm font-medium transition-all px-3 py-2 rounded-full whitespace-nowrap flex-shrink-0 ${
              feedType === "major"
                ? "bg-[#D08945] text-white"
                : "bg-gray-100 text-gray-700 hover:opacity-80"
            } ${isMajorDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            Studiengang
          </button>
          <button
            onClick={() => setFeedType("following")}
            className={`text-sm font-medium transition-all cursor-pointer px-3 py-2 rounded-full whitespace-nowrap flex-shrink-0 ${
              feedType === "following"
                ? "bg-[#D08945] text-white"
                : "bg-gray-100 text-gray-700 hover:opacity-80"
            }`}
          >
            Folge Ich
          </button>
          <button
            onClick={() => setFeedType("interests")}
            disabled={isInterestsDisabled}
            className={`text-sm font-medium transition-all px-3 py-2 rounded-full whitespace-nowrap flex-shrink-0 ${
              feedType === "interests"
                ? "bg-[#D08945] text-white"
                : "bg-gray-100 text-gray-700 hover:opacity-80"
            } ${isInterestsDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            Interesse
          </button>
        </div>
      </div>

      <div>
        {/* Upload Progress Bar */}
        {uploadProgress !== null && uploadProgress >= 0 && (
          <div className="px-4 mb-4">
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#D08945] to-[#F4CFAB] transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Loading State - Skeleton für Layout Stability */}
        {isLoading ? (
          <div style={{ gap: "0", margin: "0", padding: "0" }}>
            {Array.from({ length: 5 }).map((_, index) => (
              <FeedCardSkeleton
                key={`skeleton-${index}`}
                showDivider={index < 4}
              />
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div style={{ gap: "0", margin: "0", padding: "0" }}>
            {/* Posts Rendering */}
            {posts.map((post, index) => (
              <FeedCard
                key={post._id}
                post={post}
                currentUserId={currentUserId}
                showDivider={index < posts.length - 1}
                imagePriority={index < 2} // priority={true} nur für die ersten 2 Posts
              />
            ))}

            {/* Lade-Indikator (Twitter/X-Stil) - wird angezeigt wenn weitere Posts geladen werden */}
            {isLoadingMoreState && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#D08945]" />
              </div>
            )}

            {/* Unsichtbarer Sentinel für Infinite Scroll - nur wenn noch Posts vorhanden */}
            {canLoadMore && (
              <div
                ref={sentinelRef}
                style={{
                  height: "1px",
                  width: "100%",
                  position: "relative",
                  marginTop: "20px",
                  visibility: isLoadingMoreState ? "hidden" : "visible",
                }}
                aria-hidden="true"
              />
            )}

            {/* Ende-Nachricht wenn alle Posts geladen sind */}
            {!canLoadMore && posts.length > 0 && (
              <div className="flex justify-center py-8 text-sm text-gray-400">
                Du hast alle Posts gesehen
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center py-8 text-sm text-gray-400">
            Keine Posts gefunden
          </div>
        )}
      </div>
      <BottomNavigation />
    </main>
  );
}
