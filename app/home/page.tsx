"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FeedCard } from "@/components/feed-card";
import { FeedCardSkeleton } from "@/components/feed-card-skeleton";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";


import { useEffect, useRef, useState, useMemo } from "react";
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
import { usePostsCache } from "@/lib/contexts/posts-context";

/**
 * Hauptseite (geschützt) - Posts-Feed
 * Nur für authentifizierte Benutzer zugänglich
 */
export default function Home() {
  const router = useRouter();
  const { session, currentUserId, currentUser } = useCurrentUser();
  const [feedType, setFeedType] = useState<"all" | "major" | "following" | "interests">("all");
  const preloadedImages = useRef<Set<string>>(new Set());
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  // MOBILE FIX: Kleinere initiale Post-Anzahl auf Mobile für bessere Performance
  const [visiblePostsCount, setVisiblePostsCount] = useState(() => {
    if (typeof window !== "undefined") {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || (window.matchMedia && window.matchMedia("(max-width: 768px)").matches);
      return isMobileDevice ? 8 : 10; // Mobile: 8 Posts, Desktop: 10 Posts
    }
    return 10;
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Loading-State für weitere Posts

  // MOBILE FIX: Prüfe, ob es ein mobiles Gerät ist
  useEffect(() => {
    setIsMobile(isMobileDevice());

    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Globaler Posts Cache - bleibt über Unmounts erhalten
  const { setPosts: cachePosts, getPosts: getCachedPosts } = usePostsCache();

  // Cache Key für diesen Feed-Typ
  const cacheKey = useMemo(() => {
    return `posts_${feedType}_${currentUserId || "anonymous"}`;
  }, [feedType, currentUserId]);

  // Get current user's major and interests for filtering
  // Nur als disabled markieren, wenn currentUser geladen ist und tatsächlich keine Daten hat
  const currentUserMajor = currentUser ? (currentUser as any)?.major : undefined;
  const currentUserInterests = currentUser ? ((currentUser as any)?.interests || []) : undefined;

  // Buttons nur disable wenn User geladen ist und tatsächlich keine Daten hat
  const isMajorDisabled = currentUser !== undefined && !currentUserMajor;
  const isInterestsDisabled = currentUser !== undefined && (!currentUserInterests || currentUserInterests.length === 0);

  // Stabilisiere Query Args mit useMemo - verhindert Re-Subscriptions
  const allPostsArgs = useMemo(() => {
    return feedType === "all" && currentUserId ? { userId: currentUserId } : "skip";
  }, [feedType, currentUserId]);

  const filteredPostsByMajorArgs = useMemo(() => {
    return feedType === "major" && currentUser && currentUserMajor ? {
      major: currentUserMajor,
      userId: currentUserId,
    } : "skip";
  }, [feedType, currentUser, currentUserMajor, currentUserId]);

  const filteredPostsByInterestsArgs = useMemo(() => {
    return feedType === "interests" && currentUser && currentUserInterests && currentUserInterests.length > 0 ? {
      interests: currentUserInterests,
      userId: currentUserId,
    } : "skip";
  }, [feedType, currentUser, currentUserInterests, currentUserId]);

  const followingPostsArgs = useMemo(() => {
    return feedType === "following" && currentUserId ? { userId: currentUserId } : "skip";
  }, [feedType, currentUserId]);

  // Lade nur den aktuell ausgewählten Feed für bessere Performance
  const allPosts = useQuery(api.queries.getFeed, allPostsArgs);
  const filteredPostsByMajor = useQuery(api.queries.getFilteredFeed, filteredPostsByMajorArgs);
  const filteredPostsByInterests = useQuery(api.queries.getFilteredFeed, filteredPostsByInterestsArgs);
  const followingPosts = useQuery(api.queries.getFollowingFeed, followingPostsArgs);

  // Verwende den entsprechenden Feed basierend auf feedType
  const postsFromQuery = feedType === "all"
    ? allPosts
    : feedType === "major"
      ? filteredPostsByMajor
      : feedType === "interests"
        ? filteredPostsByInterests
        : followingPosts;

  // MOBILE FIX: Reset visiblePostsCount wenn Feed-Type sich ändert
  useEffect(() => {
    // Reset auf initiale Anzahl basierend auf Device
    const initialCount = isMobile ? 8 : 10;
    setVisiblePostsCount(initialCount);
    setIsLoadingMore(false);
    isLoadMoreInProgressRef.current = false;
    if (isMobile) {
      console.log("[Mobile Debug] Feed type changed, reset to", initialCount, "posts");
    }
  }, [feedType, isMobile]);

  // Aktualisiere Cache, wenn neue Posts geladen sind
  useEffect(() => {
    if (postsFromQuery !== undefined && Array.isArray(postsFromQuery) && postsFromQuery.length > 0) {
      cachePosts(cacheKey, postsFromQuery);
    }
  }, [postsFromQuery, cacheKey, cachePosts]);

  // Verwende gecachte Posts sofort, aktualisiere mit neuen Daten wenn verfügbar
  // Twitter-ähnliches Verhalten: Zeige alte Daten sofort, lade neue im Hintergrund
  const cachedPostsForCurrentKey = getCachedPosts(cacheKey);

  const posts = useMemo(() => {
    let postsToUse: typeof postsFromQuery = [];
    
    // Wenn neue Daten verfügbar sind, verwende diese
    if (postsFromQuery !== undefined) {
      postsToUse = postsFromQuery;
    }
    // Verwende gecachte Posts sofort (falls vorhanden) - sowohl auf Mobile als auch Desktop
    else if (cachedPostsForCurrentKey && cachedPostsForCurrentKey.length > 0) {
      postsToUse = cachedPostsForCurrentKey;
    }
    
    // WICHTIG: Sortiere Posts immer nach createdAt (neueste zuerst)
    // Verhindert, dass alte Posts vor neuen Posts angezeigt werden
    if (Array.isArray(postsToUse) && postsToUse.length > 0) {
      return [...postsToUse].sort((a, b) => {
        const aTime = a.createdAt || 0;
        const bTime = b.createdAt || 0;
        return bTime - aTime; // Descending: neueste zuerst
      });
    }
    
    // Keine Daten verfügbar
    return [];
  }, [postsFromQuery, cachedPostsForCurrentKey]);

  // Zeige Loading-Indikator/Skeleton nur wenn:
  // 1. Neue Daten werden geladen (postsFromQuery ist undefined)
  // 2. UND wir haben KEINE gecachten Posts (sonst zeigen wir die gecachten Posts)
  const hasCachedPosts = cachedPostsForCurrentKey && cachedPostsForCurrentKey.length > 0;
  const isLoading = postsFromQuery === undefined && !hasCachedPosts;



  // Zum Login umleiten, wenn nicht authentifiziert
  useEffect(() => {
    if (session === null) {
      router.push("/");
    }
  }, [session, router]);

  // Prüfe, ob Seite bereits besucht wurde
  useEffect(() => {
    const visited = sessionStorage.getItem("home_visited");
    if (visited) {
      setIsFirstVisit(false);
    } else {
      // Markiere Seite als besucht nach kurzer Verzögerung
      const timer = setTimeout(() => {
        sessionStorage.setItem("home_visited", "true");
        setIsFirstVisit(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  // Kein Loading Screen - zeige gecachte Daten sofort an

  // KEIN Preloading auf Mobile - verhindert Memory-Probleme
  // Desktop: Nur erste 2 Bilder für sofortige Anzeige
  useEffect(() => {
    if (!posts || isMobile) return; // Mobile: KEIN Preloading

    // Desktop: Nur die ersten 2 Bilder vorladen
    const postsToPreload = posts.slice(0, 2);
    postsToPreload.forEach((post) => {
      if (post.imageUrl && !preloadedImages.current.has(post.imageUrl)) {
        const img = new Image();
        img.src = post.imageUrl;
        img.loading = "lazy";
        preloadedImages.current.add(post.imageUrl);
      }
    });
  }, [posts, isMobile]);

  // Refs für Observer Management (verhindert Memory-Leaks)
  const observerRef = useRef<IntersectionObserver | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isLoadMoreInProgressRef = useRef(false); // Verhindert mehrfaches Laden

  // MOBILE FIX: Infinite Scroll mit optimiertem Intersection Observer
  useEffect(() => {
    // Guard: Stoppe wenn keine Posts oder bereits alle geladen
    if (!posts || posts.length <= visiblePostsCount) {
      // Cleanup wenn keine weiteren Posts zu laden sind
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      setIsLoadingMore(false);
      isLoadMoreInProgressRef.current = false;
      return;
    }

    // Guard: Stoppe wenn bereits ein Load in Progress ist
    if (isLoadingMore || isLoadMoreInProgressRef.current) {
      return; // Warte bis aktueller Load fertig ist
    }

    const sentinelId = "infinite-scroll-sentinel";
    
    // MOBILE FIX: Verwende requestAnimationFrame für bessere Performance
    const frameId = requestAnimationFrame(() => {
      const sentinelElement = document.getElementById(sentinelId);
      if (!sentinelElement) {
        if (isMobile) {
          console.log("[Mobile Debug] Sentinel element not found");
        }
        return;
      }

      // Cleanup vorheriger Observer (falls vorhanden)
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      // MOBILE FIX: Optimierte Intersection Observer Settings für Mobile
      // Größerer rootMargin auf Mobile = früherer Trigger = weniger aggressive Scrolls nötig
      // Höherer threshold = mehr vom Element muss sichtbar sein = weniger false positives
      const observerOptions = {
        // Mobile: Größerer rootMargin (200px) für früheren Trigger, aber höherer threshold
        // Desktop: Standard rootMargin (200px) mit niedrigerem threshold
        rootMargin: isMobile ? "200px" : "200px",
        // Mobile: Höherer threshold (0.3) = 30% des Elements muss sichtbar sein
        // Verhindert zu frühe Triggers bei schnellem Scrollen
        threshold: isMobile ? 0.3 : 0.1,
        // root: null = viewport (Standard)
        root: null,
      };

      if (isMobile) {
        console.log("[Mobile Debug] Creating Intersection Observer:", observerOptions);
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // MOBILE FIX: Zusätzliche Guards für Mobile
            if (!entry.isIntersecting) {
              if (isMobile && entry.boundingClientRect.top > window.innerHeight) {
                console.log("[Mobile Debug] Sentinel not intersecting, top:", entry.boundingClientRect.top);
              }
              return;
            }
            
            // Prüfe aktuelle Werte (nicht aus Closure) - verhindert Stale Closures
            const currentVisibleCount = visiblePostsCount;
            const totalPosts = posts.length;
            
            // MOBILE FIX: Zusätzliche Validierung für Mobile
            if (currentVisibleCount >= totalPosts) {
              if (isMobile) {
                console.log("[Mobile Debug] All posts already visible");
              }
              return;
            }
            
            if (isLoadingMore || isLoadMoreInProgressRef.current) {
              if (isMobile) {
                console.log("[Mobile Debug] Load already in progress, skipping");
              }
              return;
            }

            // MOBILE FIX: Setze Flag sofort (verhindert Race Conditions)
            isLoadMoreInProgressRef.current = true;
            setIsLoadingMore(true);
            
            // MOBILE FIX: Debug Logging für Mobile
            if (isMobile) {
              console.log("[Mobile Debug] LoadMore triggered:", {
                current: currentVisibleCount,
                total: totalPosts,
                remaining: totalPosts - currentVisibleCount,
                intersectionRatio: entry.intersectionRatio,
                boundingClientRect: entry.boundingClientRect,
              });
            }
            
            // Posts sind bereits geladen (im State), müssen nur angezeigt werden
            const currentPostsLength = posts.length;
            
            // MOBILE FIX: Verwende requestAnimationFrame für flüssige Animation
            animationFrameRef.current = requestAnimationFrame(() => {
              setVisiblePostsCount((prev) => {
                // MOBILE FIX: Kleinere Batch-Größe auf Mobile (10 statt 10 für bessere Performance)
                const batchSize = isMobile ? 10 : 10;
                const newCount = Math.min(prev + batchSize, currentPostsLength);
                
                if (isMobile) {
                  console.log("[Mobile Debug] Posts loaded:", {
                    before: prev,
                    after: newCount,
                    total: currentPostsLength,
                    batchSize,
                  });
                }
                
                // Reset Flags sofort nach Update
                isLoadMoreInProgressRef.current = false;
                setIsLoadingMore(false);
                
                return newCount;
              });
              animationFrameRef.current = null;
            });
          });
        },
        observerOptions
      );

      observerRef.current.observe(sentinelElement);
      
      if (isMobile) {
        console.log("[Mobile Debug] Observer attached to sentinel");
      }
    });

    // MOBILE FIX: Cleanup mit besserer Fehlerbehandlung
    return () => {
      cancelAnimationFrame(frameId);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Observer nur disconnecten, wenn kein Load in Progress ist
      if (!isLoadingMore && !isLoadMoreInProgressRef.current && observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
        if (isMobile) {
          console.log("[Mobile Debug] Observer disconnected");
        }
      }
    };
  }, [posts, visiblePostsCount, isMobile]); // isLoadingMore aus Dependencies entfernt (verhindert Loop)

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

    // Initial check
    checkProgress();

    // Poll every 100ms für smooth progress
    const interval = setInterval(checkProgress, 100);

    return () => clearInterval(interval);
  }, []);

  // Konsistentes Layout immer beibehalten
  return (
    <main 
      className="min-h-dvh w-full max-w-[428px] mx-auto pb-24 header-spacing overflow-x-hidden"
      style={{ 
        // MOBILE FIX: Verhindere Pull-to-Refresh und Overscroll
        overscrollBehavior: "none",
        overscrollBehaviorY: "none",
        overscrollBehaviorX: "none",
        // Verhindere Momentum-Scrolling am Ende
        WebkitOverflowScrolling: "touch",
        // Touch-Optimierungen
        touchAction: "pan-y pan-x",
      }}
    >
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="px-4 mb-4">
        {/* Feed Filter Links */}
        <div className="flex items-center justify-center gap-2 mb-4 mt-4 flex-nowrap overflow-x-auto">
          <button
            onClick={() => setFeedType("all")}
            className={`text-sm font-medium transition-all cursor-pointer px-3 py-2 rounded-full whitespace-nowrap flex-shrink-0 ${feedType === "all"
              ? "bg-[#D08945] text-white"
              : "bg-gray-100 text-gray-700 hover:opacity-80"
              }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFeedType("major")}
            disabled={isMajorDisabled}
            className={`text-sm font-medium transition-all px-3 py-2 rounded-full whitespace-nowrap flex-shrink-0 ${feedType === "major"
              ? "bg-[#D08945] text-white"
              : "bg-gray-100 text-gray-700 hover:opacity-80"
              } ${isMajorDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            Studiengang
          </button>
          <button
            onClick={() => setFeedType("following")}
            className={`text-sm font-medium transition-all cursor-pointer px-3 py-2 rounded-full whitespace-nowrap flex-shrink-0 ${feedType === "following"
              ? "bg-[#D08945] text-white"
              : "bg-gray-100 text-gray-700 hover:opacity-80"
              }`}
          >
            Folge Ich
          </button>
          <button
            onClick={() => setFeedType("interests")}
            disabled={isInterestsDisabled}
            className={`text-sm font-medium transition-all px-3 py-2 rounded-full whitespace-nowrap flex-shrink-0 ${feedType === "interests"
              ? "bg-[#D08945] text-white"
              : "bg-gray-100 text-gray-700 hover:opacity-80"
              } ${isInterestsDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            Interesse
          </button>
        </div>
      </div>
      <div>
        {/* Upload Progress Bar - oberhalb der Posts, nur wenn Upload aktiv */}
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



        {isLoading ? (
          // Zeige Skeleton während des Ladens
          <div style={{ gap: "0", margin: "0", padding: "0" }}>
            {Array.from({ length: 5 }).map((_, index) => (
              <FeedCardSkeleton
                key={`skeleton-${index}`}
                showDivider={index < 4}
              />
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div 
            style={{ 
              gap: "0", 
              margin: "0", 
              padding: "0",
              // MOBILE FIX: Verhindere Pull-to-Refresh auf diesem Container
              overscrollBehavior: "none",
              overscrollBehaviorY: "none",
            }} 
            data-posts-container
          >
            {/* MOBILE FIX: Windowed Rendering - Nur sichtbare Posts rendern für bessere Performance */}
            {/* Auf Mobile: Maximal 50 Posts gleichzeitig gerendert (verhindert Memory-Probleme) */}
            {posts.slice(0, Math.min(visiblePostsCount, isMobile ? 50 : Infinity)).map((post, index) => (
              <FeedCard
                key={post._id}
                post={post}
                currentUserId={currentUserId}
                showDivider={index < Math.min(visiblePostsCount, posts.length) - 1}
                imagePriority={index < 2} // priority={true} nur für die ersten 2 Posts
              />
            ))}
            {/* Lade-Indikator (Twitter/X-Stil) - wird angezeigt wenn weitere Posts geladen werden */}
            {isLoadingMore && visiblePostsCount < posts.length && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#D08945]" />
              </div>
            )}
            {/* Unsichtbarer Sentinel für Infinite Scroll - nur wenn noch Posts vorhanden */}
            {visiblePostsCount < posts.length && !isLoadingMore && (
              <div
                id="infinite-scroll-sentinel"
                style={{
                  height: "1px",
                  width: "100%",
                  position: "relative",
                  marginTop: "20px",
                }}
                aria-hidden="true"
              />
            )}
            {/* Ende-Nachricht wenn alle Posts geladen sind */}
            {visiblePostsCount >= posts.length && posts.length > 0 && (
              <div className="flex justify-center py-8 text-sm text-gray-400">
                Du hast alle Posts gesehen
              </div>
            )}
          </div>
        ) : null}
      </div>
      <BottomNavigation />
    </main>
  );
}
