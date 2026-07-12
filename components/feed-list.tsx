"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { FeedCard } from "@/components/feed-card";
import { FeedSkeleton } from "@/components/feed-skeleton";
import { Spinner } from "@/components/ui/spinner";
import { usePostsCache } from "@/lib/contexts/posts-context";
import { useEffect, useMemo, useRef, useState } from "react";

export type FeedType = "all" | "major" | "following" | "interests";
export type RankingMode = "chronological" | "engagement";

interface FeedListProps {
  feedType: FeedType;
  rankingMode: RankingMode;
  currentUserId?: Id<"users">;
  /** Ob dieser Feed aktuell sichtbar ist (steuert Infinite-Scroll & Bild-Priorität) */
  isActive: boolean;
}

// Wie viele Beiträge pro "Seite" clientseitig zusätzlich gerendert werden (Infinite Scroll).
const PAGE_SIZE = 10;

const EMPTY_MESSAGES: Record<FeedType, { title: string; subtitle: string }> = {
  all: {
    title: "Keine Beiträge gefunden.",
    subtitle: "Erstelle einen neuen Beitrag, um die Community zu beleben!",
  },
  major: {
    title: "Noch keine Beiträge aus deinem Studiengang.",
    subtitle: "Sei die erste Person, die hier etwas teilt!",
  },
  following: {
    title: "Hier ist noch nichts.",
    subtitle:
      "Folge anderen Nutzern – sobald sie etwas posten, erscheint es hier.",
  },
  interests: {
    title: "Keine Beiträge zu deinen Interessen.",
    subtitle: "Sobald es passende Beiträge gibt, erscheinen sie hier.",
  },
};

/**
 * Ein eigenständiger Feed für genau einen Feed-Typ.
 * Jede Instanz hält ihre eigene Convex-Subscription, ihren Cache-Zustand und ihre
 * (clientseitige) Pagination. Dadurch bleiben Zustand, Beiträge und Scroll-Kontext
 * erhalten, solange die Komponente gemountet ist (auch wenn sie ausgeblendet wird).
 */
export function FeedList({ feedType, rankingMode, currentUserId, isActive }: FeedListProps) {
  const {
    setPosts: cachePosts,
    getPosts: getCachedPosts,
    hasLoadedThisSession,
    markLoadedThisSession,
  } = usePostsCache();

  const cacheKey = useMemo(
    () => `posts_${feedType}_${rankingMode}_${currentUserId ?? "anonymous"}`,
    [feedType, rankingMode, currentUserId]
  );

  const postsFromQuery = useQuery(
    api.queries.getFeedWithRanking,
    currentUserId ? { userId: currentUserId, feedType, rankBy: rankingMode } : {}
  );

  type FeedPost = NonNullable<typeof postsFromQuery>[number];

  // Ob dieser Feed in DIESER Laufzeit-Session schon geladen wurde (überlebt SPA-Navigation,
  // wird bei echtem Reload zurückgesetzt).
  const loadedThisSession = hasLoadedThisSession(cacheKey);

  // Feed cachen sobald geladen und als "in dieser Session geladen" markieren.
  useEffect(() => {
    if (postsFromQuery !== undefined && Array.isArray(postsFromQuery)) {
      cachePosts(cacheKey, postsFromQuery);
      markLoadedThisSession(cacheKey);
    }
  }, [postsFromQuery, cacheKey, cachePosts, markLoadedThisSession]);

  const cached = getCachedPosts(cacheKey) as FeedPost[] | undefined;

  const posts: FeedPost[] = useMemo(() => {
    // Frische Daten haben Vorrang.
    if (postsFromQuery !== undefined) return postsFromQuery;
    // Gecachte Beiträge nur zeigen, wenn dieser Feed in dieser Session schon geladen war
    // (also nach In-App-Rückkehr) – nach echtem Reload stattdessen Skeleton, kein Cache.
    if (loadedThisSession && cached && cached.length > 0) return cached;
    return [];
  }, [postsFromQuery, cached, loadedThisSession]);

  // Skeleton beim ERSTEN Öffnen in dieser Laufzeit-Session: keine frischen Daten und
  // dieser Feed wurde in dieser Session noch nicht geladen. Nach vollständigem Reload
  // ist der Marker leer -> jeder Feed zeigt beim ersten Klick wieder ein Skeleton.
  const showSkeleton = postsFromQuery === undefined && !loadedThisSession;

  // Clientseitige Pagination – pro Feed-Instanz eigener Zustand, bleibt beim Tab-Wechsel erhalten.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Neue Sortierung ist ein bewusster Re-Sort -> Pagination zurücksetzen.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [rankingMode]);

  const visiblePosts = useMemo(() => posts.slice(0, visibleCount), [posts, visibleCount]);
  const hasMore = visibleCount < posts.length;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isActive || !hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, posts.length));
        }
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isActive, hasMore, posts.length]);

  // Erstes Laden -> Skeleton-Karten (kein Loading-Spinner, kein weißer Bereich).
  if (showSkeleton) {
    return <FeedSkeleton />;
  }

  // Feed geladen, aber leer.
  if (posts.length === 0) {
    const msg = EMPTY_MESSAGES[feedType];
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <p className="text-gray-500 font-semibold text-base mb-1">{msg.title}</p>
        <p className="text-gray-400 text-xs">{msg.subtitle}</p>
      </div>
    );
  }

  return (
    <div>
      {visiblePosts.map((post, index) => (
        <FeedCard
          key={post._id}
          post={post}
          currentUserId={currentUserId}
          showDivider={index < visiblePosts.length - 1}
          isFirst={isActive && index < 2}
        />
      ))}
      {/* Nachladen weiterer Beiträge: nur unten ein kleiner Ladezustand */}
      {hasMore && (
        <div ref={sentinelRef} className="py-6 flex items-center justify-center">
          <Spinner size="sm" />
        </div>
      )}
    </div>
  );
}
