"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FeedCard } from "@/components/feed-card";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { LoadingScreen, Spinner } from "@/components/ui/spinner";
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
  
  // Prüfe, ob es ein mobiles Gerät ist
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

  // Cache für alle Feeds - lade alle parallel, damit sie gecached sind
  const allPosts = useQuery(
    api.queries.getFeed,
    currentUserId ? { userId: currentUserId } : {}
  );
  const filteredPostsByMajor = useQuery(
    api.queries.getFilteredFeed,
    currentUser && currentUserMajor ? {
      major: currentUserMajor,
      userId: currentUserId,
    } : "skip"
  );
  const filteredPostsByInterests = useQuery(
    api.queries.getFilteredFeed,
    currentUser && currentUserInterests && currentUserInterests.length > 0 ? {
      interests: currentUserInterests,
      userId: currentUserId,
    } : "skip"
  );
  const followingPosts = useQuery(
    api.queries.getFollowingFeed,
    currentUserId ? { userId: currentUserId } : "skip"
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
  // NUR AUF MOBILE - auf Desktop normales Verhalten
  const cachedPostsForCurrentKey = getCachedPosts(cacheKey);
  
  const posts = useMemo(() => {
    // Wenn neue Daten verfügbar sind, verwende diese
    if (postsFromQuery !== undefined) {
      return postsFromQuery;
    }
    // Auf Mobile: Verwende gecachte Posts sofort (falls vorhanden)
    // Auf Desktop: Verwende gecachte Posts nur wenn verfügbar, sonst leeres Array
    if (isMobile && cachedPostsForCurrentKey && cachedPostsForCurrentKey.length > 0) {
      return cachedPostsForCurrentKey;
    }
    // Auf Desktop: Keine gecachten Posts verwenden, warte auf neue Daten
    if (!isMobile) {
      return [];
    }
    return [];
  }, [postsFromQuery, cachedPostsForCurrentKey, isMobile]);
  
  // Zeige Loading-Indikator nur auf Mobile:
  // 1. Neue Daten werden geladen (postsFromQuery ist undefined)
  // 2. UND wir haben bereits gecachte Posts (damit wir etwas anzeigen können)
  const hasCachedPosts = cachedPostsForCurrentKey && cachedPostsForCurrentKey.length > 0;
  const isLoadingNewData = isMobile && postsFromQuery === undefined && hasCachedPosts;
  
  // Initial Load: 
  // - Auf Mobile: Nur wenn keine gecachten Posts vorhanden sind
  // - Auf Desktop: Immer wenn keine neuen Daten verfügbar sind
  const isInitialLoad = postsFromQuery === undefined && (!isMobile || !hasCachedPosts);

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

  // Preload alle Bilder im Hintergrund, sobald Posts verfügbar sind
  // Dies lädt die Bilder bereits während "Feed wird geladen..." im Hintergrund
  useEffect(() => {
    if (!posts) return;

    // Alle Bilder parallel vorladen für sofortige Anzeige
    posts.forEach((post) => {
      if (post.imageUrl && !preloadedImages.current.has(post.imageUrl)) {
        // Image-Objekt für Browser-Cache (kein Link-Preload, um Warnungen zu vermeiden)
        const img = new Image();
        img.src = post.imageUrl;
        img.loading = "eager";
        img.fetchPriority = "high";

        preloadedImages.current.add(post.imageUrl);
      }
    });
  }, [posts]);

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
        <div className="flex items-center justify-center gap-6 mb-4 mt-4 flex-wrap">
          <button
            onClick={() => setFeedType("all")}
            className={`text-sm font-medium transition-opacity cursor-pointer ${
              feedType === "all"
                ? "underline underline-offset-8 decoration-[#D08945]"
                : "hover:opacity-70"
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFeedType("major")}
            disabled={isMajorDisabled}
            className={`text-sm font-medium transition-opacity ${
              feedType === "major"
                ? "underline underline-offset-8 decoration-[#D08945]"
                : "hover:opacity-70"
            } ${isMajorDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            Studiengang
          </button>
          <button
            onClick={() => setFeedType("following")}
            className={`text-sm font-medium transition-opacity cursor-pointer ${
              feedType === "following"
                ? "underline underline-offset-8 decoration-[#D08945]"
                : "hover:opacity-70"
            }`}
          >
            Folge Ich
          </button>
          <button
            onClick={() => setFeedType("interests")}
            disabled={isInterestsDisabled}
            className={`text-sm font-medium transition-opacity ${
              feedType === "interests"
                ? "underline underline-offset-8 decoration-[#D08945]"
                : "hover:opacity-70"
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

        {/* Loading-Indikator oben im Feed (Twitter-ähnlich) - nur wenn neue Daten geladen werden */}
        {isLoadingNewData && (
          <div className="px-4 py-2 bg-white border-b border-gray-100">
            <div className="flex items-center justify-center">
              <Spinner size="sm" />
            </div>
          </div>
        )}

        {isInitialLoad ? (
          <div className="px-4">
            <LoadingScreen text="Feed wird geladen..." />
          </div>
        ) : posts.length > 0 ? (
          <div style={{ gap: "0", margin: "0", padding: "0" }}>
            {posts.map((post, index) => (
              <FeedCard
                key={post._id}
                post={post}
                currentUserId={currentUserId}
                showDivider={index < posts.length - 1}
              />
            ))}
          </div>
        ) : null}
      </div>
      <BottomNavigation />
    </main>
  );
}




