"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FeedCard } from "@/components/feed-card";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { FeedSkeleton } from "@/components/feed-skeleton";
import { useState, useEffect } from "react";

export default function Home() {
  const posts = useQuery(api.queries.getFeed);
  const [displayPosts, setDisplayPosts] = useState<typeof posts>(posts);

  // Update display posts when new data arrives
  useEffect(() => {
    if (posts !== undefined) {
      setDisplayPosts(posts);
    }
  }, [posts]);

  return (
    <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden">
      <Header />
      <h2
        className="text-2xl font-normal px-4 mb-4"
        style={{ color: "var(--color-text-beige-light)" }}
      >
        Discover Feed
      </h2>
      <div className="px-4">
        {!displayPosts ? (
          <FeedSkeleton />
        ) : displayPosts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-[#F4CFAB]/60">Noch keine Posts vorhanden.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayPosts.map((post: typeof displayPosts[0]) => (
              <FeedCard key={post._id} post={post} />
            ))}
          </div>
        )}
      </div>
      <BottomNavigation />
    </main >
  );
}

