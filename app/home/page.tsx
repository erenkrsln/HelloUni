"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FeedCard } from "@/components/feed-card";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { LoadingScreen } from "@/components/ui/spinner";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

/**
 * Hauptseite (geschützt) - Posts-Feed
 * Nur für authentifizierte Benutzer zugänglich
 */
export default function Home() {
  const router = useRouter();
  const { session, currentUserId, currentUser } = useCurrentUser();
  const [feedType, setFeedType] = useState<"all" | "following">("all");
  const allPosts = useQuery(api.queries.getFeed);
  const followingPosts = useQuery(
    api.queries.getFollowingFeed,
    currentUserId ? { userId: currentUserId } : "skip"
  );
  const preloadedImages = useRef<Set<string>>(new Set());
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Verwende den entsprechenden Feed basierend auf feedType
  const posts = feedType === "all" ? allPosts : followingPosts;

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

  // Prüfe, ob alle Daten geladen sind (Posts und User)
  // Like-Status werden clientseitig in FeedCards geladen
  // Zeige Loading, wenn Posts noch nicht geladen sind (unabhängig von isFirstVisit)
  const isLoading = posts === undefined || currentUser === undefined;

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
    <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 header-spacing overflow-x-hidden">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="px-4 mb-4">
        {/* Feed Toggle Buttons - Zentriert nach Figma Design */}
        <div className="flex items-center justify-center gap-2 mb-4 mt-4">
          <button
            onClick={() => setFeedType("all")}
            className={`w-[104px] h-[35px] rounded-[79px] text-sm font-medium transition-all ${feedType === "all"
              ? "bg-[#d08945] text-white"
              : "bg-gray-100 text-gray-700"
              }`}
          >
            Für Dich
          </button>
          <button
            onClick={() => setFeedType("following")}
            className={`w-[104px] h-[35px] rounded-[79px] text-sm font-medium transition-all ${feedType === "following"
              ? "bg-[#d08945] text-white"
              : "bg-gray-100 text-gray-700"
              }`}
          >
            Folge Ich
          </button>
        </div>
      </div>
      <div>
        {isLoading ? (
          <div className="px-4">
            <LoadingScreen text="Feed wird geladen..." />
          </div>
        ) : posts && posts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="text-sm text-[#000000]/60">
              {feedType === "following"
                ? "Du folgst noch niemandem oder es gibt noch keine Posts von den Usern, denen du folgst."
                : "Noch keine Posts vorhanden."}
            </p>
          </div>
        ) : (
          <div style={{ gap: "0", margin: "0", padding: "0" }}>
            {posts?.map((post, index) => (
              <FeedCard
                key={post._id}
                post={post}
                currentUserId={currentUserId}
                showDivider={index < posts.length - 1}
              />
            ))}
          </div>
        )}
      </div>
      <BottomNavigation />
    </main>
  );
}

