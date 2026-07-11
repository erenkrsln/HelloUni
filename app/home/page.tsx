"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FeedCard } from "@/components/feed-card";
import { FeedSkeleton } from "@/components/feed-skeleton";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { LoadingScreen } from "@/components/ui/spinner";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { useEffect, useRef, useState, useMemo } from "react";
import { startAppTour } from "@/lib/tour";
import { User } from "lucide-react";
import NextImage from "next/image";

// Funktion zur Erkennung mobiler Geräte
const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || (window.matchMedia && window.matchMedia("(max-width: 768px)").matches);
};
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { markImageAsLoaded, isImageLoaded } from "@/lib/cache/imageCache";
import { usePostsCache } from "@/lib/contexts/posts-context";

/**
 * Hauptseite (geschützt) - Posts-Feed
 * Nur für authentifizierte Benutzer zugänglich
 */
export default function Home() {
  const router = useRouter();
  const { session, currentUserId, currentUser } = useCurrentUser();
  const [feedType, setFeedType] = useState<"all" | "major" | "following" | "interests">("all");
  const [rankingMode, setRankingMode] = useState<"chronological" | "engagement">("chronological");
  const preloadedImages = useRef<Set<string>>(new Set());
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [composerAvatarLoaded, setComposerAvatarLoaded] = useState(() =>
    isImageLoaded(currentUser?.image)
  );

  useEffect(() => {
    if (currentUser?.image) {
      setComposerAvatarLoaded(isImageLoaded(currentUser.image));
    } else {
      setComposerAvatarLoaded(true);
    }
  }, [currentUser?.image]);

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

  // Cache Key für diesen Feed-Typ und Ranking-Modus
  const cacheKey = useMemo(() => {
    return `posts_${feedType}_${rankingMode}_${currentUserId || "anonymous"}`;
  }, [feedType, rankingMode, currentUserId]);

  // Get current user's major and interests for filtering
  // Nur als disabled markieren, wenn currentUser geladen ist und tatsächlich keine Daten hat
  const currentUserMajor = currentUser ? (currentUser as any)?.major : undefined;
  const currentUserInterests = currentUser ? ((currentUser as any)?.interests || []) : undefined;

  // Buttons nur disable wenn User geladen ist und tatsächlich keine Daten hat
  const isMajorDisabled = currentUser !== undefined && !currentUserMajor;
  const isInterestsDisabled = currentUser !== undefined && (!currentUserInterests || currentUserInterests.length === 0);

  // Load feed using the unified getFeedWithRanking query supporting filters and ranking modes
  const postsFromQuery = useQuery(
    api.queries.getFeedWithRanking,
    currentUserId ? {
      userId: currentUserId,
      feedType,
      rankBy: rankingMode,
    } : {}
  );

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

  // Initial Load: 
  // - Auf Mobile: Nur wenn keine gecachten Posts vorhanden sind
  // - Auf Desktop: Immer wenn keine neuen Daten verfügbar sind
  const hasCachedPosts = cachedPostsForCurrentKey && cachedPostsForCurrentKey.length > 0;
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

  // Auto-start App Tour
  useEffect(() => {
    const hasSeenTour = localStorage.getItem("hello_uni_tour_seen");
    if (!hasSeenTour) {
      const timer = setTimeout(() => {
        startAppTour();
        localStorage.setItem("hello_uni_tour_seen", "true");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Kein Loading Screen - zeige gecachte Daten sofort an

  // Preload Post-Bilder und Avatare parallel, damit Composer und FeedCards gleichzeitig erscheinen
  useEffect(() => {
    if (!posts) return;

    const urlsToPreload = new Set<string>();

    if (currentUser?.image) {
      urlsToPreload.add(currentUser.image);
    }

    posts.forEach((post) => {
      if (post.imageUrl) {
        urlsToPreload.add(post.imageUrl);
      }
      if (post.user?.image) {
        urlsToPreload.add(post.user.image);
      }
    });

    urlsToPreload.forEach((url) => {
      if (preloadedImages.current.has(url)) return;

      preloadedImages.current.add(url);
      const img = new Image();
      img.onload = () => {
        markImageAsLoaded(url);
        if (url === currentUser?.image) {
          setComposerAvatarLoaded(true);
        }
      };
      img.src = url;
      img.loading = "eager";
      img.fetchPriority = "high";
    });
  }, [posts, currentUser?.image]);

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
    <main className="min-h-screen w-full max-w-[428px] md:max-w-3xl mx-auto pb-24 header-spacing overflow-x-hidden">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="px-4 md:px-0 mb-4">
        {/* Feed Filter Links */}
        <div className="flex items-center justify-center gap-2 mb-4 mt-4 flex-nowrap overflow-x-auto no-scrollbar md:w-full">
          <button
            onClick={() => setFeedType("all")}
            className={`text-sm font-medium transition-all cursor-pointer px-3 py-2 md:px-4 md:py-2 rounded-full whitespace-nowrap flex-shrink-0 md:flex-shrink md:flex-1 ${feedType === "all"
                ? "bg-[#D08945] text-white"
                : "bg-gray-100 text-gray-700 hover:opacity-80"
              }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFeedType("major")}
            disabled={isMajorDisabled}
            className={`text-sm font-medium transition-all px-3 py-2 md:px-4 md:py-2 rounded-full whitespace-nowrap flex-shrink-0 md:flex-shrink md:flex-1 ${feedType === "major"
                ? "bg-[#D08945] text-white"
                : "bg-gray-100 text-gray-700 hover:opacity-80"
              } ${isMajorDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            Studiengang
          </button>
          <button
            onClick={() => setFeedType("following")}
            className={`text-sm font-medium transition-all cursor-pointer px-3 py-2 md:px-4 md:py-2 rounded-full whitespace-nowrap flex-shrink-0 md:flex-shrink md:flex-1 ${feedType === "following"
                ? "bg-[#D08945] text-white"
                : "bg-gray-100 text-gray-700 hover:opacity-80"
              }`}
          >
            Folge ich
          </button>
          <button
            onClick={() => setFeedType("interests")}
            disabled={isInterestsDisabled}
            className={`text-sm font-medium transition-all px-3 py-2 md:px-4 md:py-2 rounded-full whitespace-nowrap flex-shrink-0 md:flex-shrink md:flex-1 ${feedType === "interests"
                ? "bg-[#D08945] text-white"
                : "bg-gray-100 text-gray-700 hover:opacity-80"
              } ${isInterestsDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            Interessen
          </button>
        </div>

        {/* Ranking Mode Selector */}
        <div className="flex items-center justify-center gap-2 mb-4 flex-nowrap overflow-x-auto no-scrollbar">
          <button
            onClick={() => setRankingMode("chronological")}
            className={`text-xs font-medium transition-all cursor-pointer px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${rankingMode === "chronological"
                ? "bg-slate-600 text-white"
                : "bg-slate-100 text-slate-700 hover:opacity-80"
              }`}
            title="Neueste Beiträge zuerst"
          >
            🕐 Neueste
          </button>
          <button
            onClick={() => setRankingMode("engagement")}
            className={`text-xs font-medium transition-all cursor-pointer px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${rankingMode === "engagement"
                ? "bg-slate-600 text-white"
                : "bg-slate-100 text-slate-700 hover:opacity-80"
              }`}
            title="Nach Engagement (Likes, Kommentare) sortiert"
          >
            🔥 Beliebt
          </button>
        </div>

        {/* Desktop Compose Box - Facebook/Twitter Style ("Was gibts neues?") */}
        {/* Lädt gemeinsam mit dem Feed: zeigt beim Laden/Refresh ein Skeleton wie die FeedCards */}
        {postsFromQuery === undefined ? (
          <div className="hidden md:flex items-center gap-3 px-5 py-4 bg-white rounded-3xl border-2 border-black/5">
            <div className="w-12 h-12 rounded-full bg-muted animate-pulse flex-shrink-0" />
            <div className="flex-1 h-5 bg-muted animate-pulse rounded" />
            <div className="w-24 h-10 bg-muted animate-pulse rounded-full flex-shrink-0" />
          </div>
        ) : (
          <div
            onClick={() => router.push("/create")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push("/create");
              }
            }}
            className="hidden md:flex items-center gap-3 px-5 py-4 bg-white rounded-3xl border-2 border-black/5 cursor-pointer transition-colors hover:border-black/10"
          >
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-100 flex-shrink-0">
              {currentUser?.image ? (
                <>
                  {!composerAvatarLoaded && (
                    <div className="absolute inset-0 rounded-full bg-muted animate-pulse z-10" />
                  )}
                  <NextImage
                    src={currentUser.image}
                    alt={currentUser.name || "Profil"}
                    width={128}
                    height={128}
                    quality={90}
                    className="object-cover rounded-full w-full h-full transition-opacity duration-300"
                    style={{
                      opacity: composerAvatarLoaded ? 1 : 0,
                      zIndex: composerAvatarLoaded ? 20 : 0,
                    }}
                    onLoad={() => {
                      markImageAsLoaded(currentUser.image);
                      setComposerAvatarLoaded(true);
                    }}
                  />
                </>
              ) : (
                <User className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="flex-1 text-left text-gray-400 text-lg">
              {currentUser?.name
                ? `Was machst du gerade, ${currentUser.name.split(" ")[0]}?`
                : "Was machst du gerade?"}
            </div>
            <div className="flex items-center justify-center px-5 py-2 bg-[#D08945] text-white rounded-full font-medium">
              Posten
            </div>
          </div>
        )}
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

        {/* Twitter-ähnlicher Ladeprozess: Skeleton → Daten → Bilder */}
        {postsFromQuery === undefined ? (
          // Schritt 1: Skeleton während des Data-Fetchings
          <div style={{ gap: "0", margin: "0", padding: "0" }}>
            <FeedSkeleton />
          </div>
        ) : posts.length > 0 ? (
          // Schritt 2: Echte Daten mit sanftem Einblenden
          <div style={{ gap: "0", margin: "0", padding: "0" }}>
            {posts.map((post, index) => (
              <FeedCard
                key={post._id}
                post={post}
                currentUserId={currentUserId}
                showDivider={index < posts.length - 1}
                isFirst={index < 2} // Priority für die ersten 2 Bilder
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <p className="text-gray-500 font-semibold text-base mb-1">
              {feedType === "all" ? "Keine Beiträge gefunden." : "Keine Beiträge für diesen Filter."}
            </p>
            <p className="text-gray-400 text-xs">
              Erstelle einen neuen Beitrag, um die Community zu beleben!
            </p>
          </div>
        )}
      </div>
      <BottomNavigation />
    </main>
  );
}




