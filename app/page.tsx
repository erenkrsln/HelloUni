"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FeedCard } from "@/components/feed-card";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";

export default function Home() {
  const posts = useQuery(api.queries.getFeed);

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
        {posts === undefined ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="backdrop-blur-sm p-5 animate-pulse"
                style={{
                  borderRadius: "var(--border-radius-card)",
                  backgroundColor: "rgba(255, 255, 255, 0.05)"
                }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-[#F4CFAB]/10" />
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-[#F4CFAB]/10 rounded mb-2" />
                    <div className="h-3 w-48 bg-[#F4CFAB]/10 rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-[#F4CFAB]/10 rounded" />
                  <div className="h-3 w-5/6 bg-[#F4CFAB]/10 rounded" />
                  <div className="h-3 w-4/6 bg-[#F4CFAB]/10 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-[#F4CFAB]/60">Noch keine Posts vorhanden.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post: typeof posts[0]) => (
              <FeedCard key={post._id} post={post} />
            ))}
          </div>
        )}
      </div>
      <BottomNavigation />
    </main>
  );
}

