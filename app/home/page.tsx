"use client";

import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { FeedList, type FeedType, type RankingMode } from "@/components/feed-list";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { startAppTour } from "@/lib/tour";
import { User } from "lucide-react";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { markImageAsLoaded, isImageLoaded } from "@/lib/cache/imageCache";

const FEED_TYPES: FeedType[] = ["all", "major", "following", "interests"];

const FEED_LABELS: Record<FeedType, string> = {
  all: "Alle",
  major: "Studiengang",
  following: "Folge ich",
  interests: "Interessen",
};

// Liest den aktiven Feed-Typ aus dem URL-Parameter (?feed=...), mit Fallback auf "all".
function getFeedFromUrl(): FeedType {
  if (typeof window === "undefined") return "all";
  const value = new URLSearchParams(window.location.search).get("feed");
  return FEED_TYPES.includes(value as FeedType) ? (value as FeedType) : "all";
}

/**
 * Hauptseite (geschützt) - Posts-Feed
 * Jeder Feed-Typ ist eine eigene, gemountet bleibende FeedList-Instanz. Der Wechsel
 * blendet nur um (kein Neuladen, kein Reset von Query/Pagination/Scroll).
 */
export default function Home() {
  const router = useRouter();
  const { session, currentUserId, currentUser } = useCurrentUser();

  const [activeFeed, setActiveFeed] = useState<FeedType>("all");
  const [rankingMode, setRankingMode] = useState<RankingMode>("chronological");
  // Lazy-Mounting: nur bereits besuchte Feeds werden gerendert und bleiben dann gemountet.
  const [mountedFeeds, setMountedFeeds] = useState<Set<FeedType>>(() => new Set<FeedType>(["all"]));

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [composerAvatarLoaded, setComposerAvatarLoaded] = useState(() =>
    isImageLoaded(currentUser?.image)
  );

  // Getrennte Scroll-Position je Feed-Typ (Fenster-Scroll, da die Seite scrollt).
  const scrollPositions = useRef<Record<FeedType, number>>({
    all: 0,
    major: 0,
    following: 0,
    interests: 0,
  });

  const currentUserMajor = currentUser ? currentUser.major : undefined;
  const currentUserInterests = currentUser ? (currentUser.interests ?? []) : undefined;
  const isMajorDisabled = currentUser !== undefined && !currentUserMajor;
  const isInterestsDisabled =
    currentUser !== undefined && (!currentUserInterests || currentUserInterests.length === 0);

  // Aktiven Feed beim Betreten aus der URL übernehmen (Refresh-fest / Deep-Link).
  useEffect(() => {
    const initial = getFeedFromUrl();
    if (initial !== "all") {
      setMountedFeeds((prev) => (prev.has(initial) ? prev : new Set(prev).add(initial)));
      setActiveFeed(initial);
    }
  }, []);

  // Feed wechseln: Scroll der aktuellen Ansicht sichern, umschalten, URL aktualisieren.
  const changeFeed = (next: FeedType) => {
    if (next === activeFeed) return;
    scrollPositions.current[activeFeed] = window.scrollY;
    setMountedFeeds((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
    setActiveFeed(next);
    window.history.pushState({ feed: next }, "", `${window.location.pathname}?feed=${next}`);
  };

  // Browser Zurück/Vorwärts: aktiven Feed aus der URL synchronisieren.
  useEffect(() => {
    const onPopState = () => {
      const next = getFeedFromUrl();
      scrollPositions.current[activeFeed] = window.scrollY;
      setMountedFeeds((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
      setActiveFeed(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [activeFeed]);

  // Scroll-Position des neu aktiven Feeds wiederherstellen – nach dem DOM-Update,
  // damit die (gecachten) Beiträge bereits gerendert sind.
  useLayoutEffect(() => {
    window.scrollTo(0, scrollPositions.current[activeFeed] ?? 0);
  }, [activeFeed]);

  useEffect(() => {
    if (currentUser?.image) {
      setComposerAvatarLoaded(isImageLoaded(currentUser.image));
    } else {
      setComposerAvatarLoaded(true);
    }
  }, [currentUser?.image]);

  // Zum Login umleiten, wenn nicht authentifiziert
  useEffect(() => {
    if (session === null) {
      router.push("/");
    }
  }, [session, router]);

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

  // Upload Progress Tracking
  useEffect(() => {
    const checkProgress = () => {
      const progress = sessionStorage.getItem("uploadProgress");
      setUploadProgress(progress ? parseInt(progress) : null);
    };
    checkProgress();
    const interval = setInterval(checkProgress, 100);
    return () => clearInterval(interval);
  }, []);

  const isFeedDisabled = (feed: FeedType) =>
    (feed === "major" && isMajorDisabled) || (feed === "interests" && isInterestsDisabled);

  return (
    <main className="min-h-screen w-full max-w-[428px] md:max-w-3xl mx-auto pb-24 header-spacing overflow-x-hidden">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="px-4 md:px-0 mb-4">
        {/* Feed-Tabs */}
        <div className="flex items-center justify-center gap-2 mb-4 mt-4 flex-nowrap overflow-x-auto scrollbar-hide md:w-full">
          {FEED_TYPES.map((feed) => {
            const disabled = isFeedDisabled(feed);
            const active = activeFeed === feed;
            return (
              <button
                key={feed}
                onClick={() => changeFeed(feed)}
                disabled={disabled}
                className={`text-sm font-medium transition-all px-3 py-1.5 md:px-4 md:py-2 rounded-full whitespace-nowrap flex-shrink-0 md:flex-shrink md:flex-1 ${
                  active
                    ? "bg-[#D08945] text-white"
                    : "bg-muted text-foreground hover:opacity-80"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {FEED_LABELS[feed]}
              </button>
            );
          })}
        </div>

        {/* Ranking-Modus */}
        <div className="flex items-center justify-center gap-2 mb-4 flex-nowrap overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setRankingMode("chronological")}
            className={`text-xs font-medium transition-all cursor-pointer px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${
              rankingMode === "chronological"
                ? "bg-slate-600 text-white dark:bg-slate-500"
                : "bg-muted text-foreground hover:opacity-80"
            }`}
            title="Neueste Beiträge zuerst"
          >
            🕐 Neueste
          </button>
          <button
            onClick={() => setRankingMode("engagement")}
            className={`text-xs font-medium transition-all cursor-pointer px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${
              rankingMode === "engagement"
                ? "bg-slate-600 text-white dark:bg-slate-500"
                : "bg-muted text-foreground hover:opacity-80"
            }`}
            title="Nach Relevanz und Engagement sortiert"
          >
            🔥 Empfohlen
          </button>
        </div>

        {/* Desktop Compose Box - beim Reload ein Skeleton, solange die Nutzerdaten laden */}
        {currentUser === undefined ? (
          <div className="hidden md:flex items-center gap-3 px-5 py-4 bg-background rounded-3xl border-2 border-black/5 dark:border-border">
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
            className="hidden md:flex items-center gap-3 px-5 py-4 bg-background dark:bg-card rounded-3xl border-2 border-black/5 hover:border-black/10 dark:border-border cursor-pointer transition-colors"
          >
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-border flex items-center justify-center bg-muted flex-shrink-0">
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
                <User className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 text-left text-muted-foreground text-lg">
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
        {/* Upload Progress Bar */}
        {uploadProgress !== null && uploadProgress >= 0 && (
          <div className="px-4 mb-4">
            <div className="h-1 bg-accent rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#D08945] to-[#F4CFAB] transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Feeds: jeder Feed-Typ bleibt gemountet, inaktive werden nur ausgeblendet.
            So bleiben Beiträge, Pagination und Scroll-Kontext erhalten. */}
        {FEED_TYPES.filter((feed) => mountedFeeds.has(feed)).map((feed) => (
          <div key={feed} className={activeFeed === feed ? "block" : "hidden"}>
            <FeedList
              feedType={feed}
              rankingMode={rankingMode}
              currentUserId={currentUserId}
              isActive={activeFeed === feed}
            />
          </div>
        ))}
      </div>

      <BottomNavigation />
    </main>
  );
}
