"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FeedCard } from "@/components/feed-card";
import { FeedCardSkeleton } from "@/components/feed-card-skeleton";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";


import { useEffect, useRef, useState, useMemo } from "react";

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
  const [visiblePostsCount, setVisiblePostsCount] = useState(10); // Starte mit 10 Posts auf Mobile

  // Prüfe, ob es ein mobiles Gerät ist
  useEffect(() => {
    const mobile = isMobileDevice();
    setIsMobile(mobile);
    // Auf Mobile: Starte mit weniger Posts für bessere Performance
    setVisiblePostsCount(mobile ? 10 : 20);

    const handleResize = () => {
      const mobile = isMobileDevice();
      setIsMobile(mobile);
      setVisiblePostsCount(mobile ? 10 : 20);
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

  // Lade nur den aktuell ausgewählten Feed für bessere Performance
  const allPosts = useQuery(
    api.queries.getFeed,
    feedType === "all" && currentUserId ? { userId: currentUserId } : "skip"
  );
  const filteredPostsByMajor = useQuery(
    api.queries.getFilteredFeed,
    feedType === "major" && currentUser && currentUserMajor ? {
      major: currentUserMajor,
      userId: currentUserId,
    } : "skip"
  );
  const filteredPostsByInterests = useQuery(
    api.queries.getFilteredFeed,
    feedType === "interests" && currentUser && currentUserInterests && currentUserInterests.length > 0 ? {
      interests: currentUserInterests,
      userId: currentUserId,
    } : "skip"
  );
  const followingPosts = useQuery(
    api.queries.getFollowingFeed,
    feedType === "following" && currentUserId ? { userId: currentUserId } : "skip"
  );

  // Verwende den entsprechenden Feed basierend auf feedType
  const postsFromQuery = feedType === "all"
    ? allPosts
    : feedType === "major"
      ? filteredPostsByMajor
      : feedType === "interests"
        ? filteredPostsByInterests
        : followingPosts;

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
    // Wenn neue Daten verfügbar sind, verwende diese
    if (postsFromQuery !== undefined) {
      return postsFromQuery;
    }
    // Verwende gecachte Posts sofort (falls vorhanden) - sowohl auf Mobile als auch Desktop
    if (cachedPostsForCurrentKey && cachedPostsForCurrentKey.length > 0) {
      return cachedPostsForCurrentKey;
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

  // Infinite Scroll: Automatisches Nachladen beim Scrollen
  useEffect(() => {
    // Stoppe Observer, wenn alle Posts geladen sind
    if (!posts || posts.length <= visiblePostsCount) {
      // Entferne Sentinel-Element wenn alle Posts geladen sind
      const sentinelId = "infinite-scroll-sentinel";
      const sentinelElement = document.getElementById(sentinelId);
      if (sentinelElement) {
        sentinelElement.remove();
      }
      return;
    }

    const sentinelId = "infinite-scroll-sentinel";
    
    // Warte kurz, damit DOM gerendert ist
    const timeoutId = setTimeout(() => {
      const sentinelElement = document.getElementById(sentinelId);
      if (!sentinelElement) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && visiblePostsCount < posts.length) {
              // Lade 5 weitere Posts automatisch
              setVisiblePostsCount((prev) => {
                const newCount = Math.min(prev + 5, posts.length);
                return newCount;
              });
            }
          });
        },
        {
          rootMargin: "200px", // Reduziert von 300px auf 200px
          threshold: 0.1,
        }
      );

      observer.observe(sentinelElement);

      return () => {
        observer.disconnect();
      };
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [posts, visiblePostsCount]);

  // Fallback: Scroll-Event für Infinite Scroll (falls Intersection Observer nicht funktioniert)
  useEffect(() => {
    // Stoppe Scroll-Listener, wenn alle Posts geladen sind
    if (!posts || posts.length <= visiblePostsCount) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Prüfe erneut, ob noch Posts geladen werden müssen
          if (visiblePostsCount >= posts.length) {
            ticking = false;
            return;
          }

          const scrollPosition = window.innerHeight + window.scrollY;
          const documentHeight = document.documentElement.scrollHeight;
          
          // Wenn User nahe am Ende ist (200px vor Ende), lade mehr Posts
          if (scrollPosition >= documentHeight - 200 && visiblePostsCount < posts.length) {
            setVisiblePostsCount((prev) => Math.min(prev + 5, posts.length));
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [posts, visiblePostsCount]);

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
    <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 header-spacing overflow-x-hidden">
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
          <div style={{ gap: "0", margin: "0", padding: "0" }} data-posts-container>
            {/* Windowed Rendering: Nur sichtbare Posts rendern (verhindert Mobile Crashes) */}
            {posts.slice(0, visiblePostsCount).map((post, index) => (
              <div key={post._id} data-post-index={index}>
                <FeedCard
                  post={post}
                  currentUserId={currentUserId}
                  showDivider={index < Math.min(visiblePostsCount, posts.length) - 1}
                  imagePriority={index < 2} // priority={true} nur für die ersten 2 Posts
                />
              </div>
            ))}
            {/* Unsichtbarer Sentinel für Infinite Scroll - nur wenn noch Posts vorhanden */}
            {visiblePostsCount < posts.length ? (
              <div
                id="infinite-scroll-sentinel"
                style={{
                  height: "1px",
                  width: "100%",
                  position: "relative",
                  marginTop: "20px", // Minimaler Abstand
                }}
                aria-hidden="true"
              />
            ) : (
              // Zeige "Ende erreicht" nur wenn wirklich alle Posts geladen sind
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
