"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FeedCard } from "@/components/feed-card";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { LoadingScreen } from "@/components/ui/spinner";
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
  const posts = useQuery(api.queries.getFeed);
  const preloadedImages = useRef<Set<string>>(new Set());
  const [isFirstVisit, setIsFirstVisit] = useState(true);

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
  // Zeige Loading nur beim ersten Besuch, sonst warte auf gecachte Daten
  const isLoading = isFirstVisit && (posts === undefined || currentUser === undefined);

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
            {posts?.map((post) => (
              <FeedCard 
                key={post._id} 
                post={post}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
      <BottomNavigation />
    </main>
  );
}

