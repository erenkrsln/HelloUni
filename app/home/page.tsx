"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FeedCard } from "@/components/feed-card";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { LoadingScreen } from "@/components/ui/spinner";
import { useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

/**
 * Hauptseite (geschützt) - Posts-Feed
 * Nur für authentifizierte Benutzer zugänglich
 */
export default function Home() {
  const router = useRouter();
  const { session, currentUserId, currentUser } = useCurrentUser();
  const posts = useQuery(api.queries.getFeed);
  const preloadedImages = useRef<Set<string>>(new Set());

  // Zum Login umleiten, wenn nicht authentifiziert
  useEffect(() => {
    if (session === null) {
      router.push("/");
    }
  }, [session, router]);

  // Lade alle Like-Status parallel für alle Posts, BEVOR FeedCards gerendert werden
  // Dies verhindert, dass das Herz erst weiß und dann rot wird
  const postIds = useMemo(() => posts?.map(post => post._id) || [], [posts]);
  
  // Lade Like-Status für alle Posts parallel (maximal 20 für Performance)
  const maxPosts = 20;
  const limitedPostIds = postIds.slice(0, maxPosts);
  
  const likeStatuses = limitedPostIds.map(postId => 
    useQuery(
      api.queries.getUserLikes,
      currentUserId && postId
        ? { userId: currentUserId, postId }
        : "skip"
    )
  );

  // Erstelle Map von Post-IDs zu Like-Status
  const likesMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    limitedPostIds.forEach((postId, index) => {
      const status = likeStatuses[index];
      if (status !== undefined) {
        map[postId] = status;
      }
    });
    return map;
  }, [limitedPostIds, likeStatuses]);

  // Prüfe, ob alle Daten geladen sind (Posts, User, und Like-Status)
  // Warte nur auf die ersten maxPosts, um nicht zu lange zu warten
  const allLikesLoaded = limitedPostIds.length === 0 || likeStatuses.every(status => status !== undefined);
  const isLoading = posts === undefined || currentUser === undefined || !allLikesLoaded;

  // Preload alle Bilder im Hintergrund, sobald Posts verfügbar sind
  // Dies lädt die Bilder bereits während "Feed wird geladen..." im Hintergrund
  useEffect(() => {
    if (!posts) return;

    // Alle Bilder parallel vorladen für sofortige Anzeige
    posts.forEach((post) => {
      if (post.imageUrl && !preloadedImages.current.has(post.imageUrl)) {
        // Methode 1: Image-Objekt für Browser-Cache
        const img = new Image();
        img.src = post.imageUrl;
        img.loading = "eager";
        img.fetchPriority = "high";
        
        // Methode 2: Link-Preload für persistenten Cache
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = post.imageUrl;
        link.fetchPriority = "high";
        document.head.appendChild(link);
        
        preloadedImages.current.add(post.imageUrl);
      }
    });
  }, [posts]);

  // Konsistentes Layout immer beibehalten
  return (
    <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden">
      <Header />
      <div className="px-4 mb-4">
        <h2
          className="text-2xl font-normal"
          style={{ color: "var(--color-text-beige-light)" }}
        >
          Discover Feed
        </h2>
      </div>
      <div className="px-4">
        {isLoading ? (
          <LoadingScreen text="Feed wird geladen..." />
        ) : posts && posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-[#F4CFAB]/60">Noch keine Posts vorhanden.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts?.map((post) => {
              // Hole Like-Status aus der Map (wenn verfügbar)
              // Dies stellt sicher, dass das Herz beim ersten Render bereits rot ist, wenn geliked
              const isLiked = likesMap[post._id] ?? undefined;
              return (
                <FeedCard 
                  key={post._id} 
                  post={{ ...post, isLiked }}
                  currentUserId={currentUserId}
                />
              );
            })}
          </div>
        )}
      </div>
      <BottomNavigation />
    </main>
  );
}

