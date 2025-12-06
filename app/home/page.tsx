"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FeedCard } from "@/components/feed-card";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { LoadingScreen } from "@/components/ui/spinner";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

/**
 * Hauptseite (geschützt) - Posts-Feed
 * Nur für authentifizierte Benutzer zugänglich
 */
export default function Home() {
  const router = useRouter();
  const { session, currentUserId } = useCurrentUser();
  const posts = useQuery(api.queries.getFeed);

  // Zum Login umleiten, wenn nicht authentifiziert
  useEffect(() => {
    if (session === null) {
      router.push("/");
    }
  }, [session, router]);

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
        <p className="text-sm text-gray-600 mt-1">
          Willkommen, {session?.user?.name || "Benutzer"}
        </p>
      </div>
      <div className="px-4">
        {!posts ? (
          <LoadingScreen text="Feed wird geladen..." />
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-[#F4CFAB]/60">Noch keine Posts vorhanden.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <FeedCard key={post._id} post={post} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </div>
      <BottomNavigation />
    </main>
  );
}

