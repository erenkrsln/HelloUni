"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { FeedCard } from "@/components/feed-card";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useParams, useRouter } from "next/navigation";
import { FeedSkeleton } from "@/components/feed-skeleton";

export default function PostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { currentUserId, isLoading: isUserLoading } = useCurrentUser();

  // Try to parse the ID. If it's invalid, Convex might throw, so we just cast it.
  // We'll let the query return null if it's not found.
  const postId = params?.id as Id<"posts">;

  const post = useQuery(
    api.queries.getPost,
    postId ? { postId, userId: currentUserId } : "skip"
  );

  return (
    <main className="min-h-screen w-full max-w-[428px] md:max-w-3xl mx-auto pb-24 header-spacing overflow-x-hidden bg-gray-50/50">
      <Header title="Beitrag" />
      
      <div className="pt-4">
        {post === undefined ? (
          <FeedSkeleton />
        ) : post === null ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🔍</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Beitrag nicht gefunden</h2>
            <p className="text-gray-500 mb-6">
              Dieser Beitrag existiert nicht mehr oder wurde gelöscht.
            </p>
            <button
              onClick={() => router.push("/home")}
              className="px-6 py-2 bg-[#D08945] text-white rounded-full font-medium transition-colors hover:bg-[#b8783d]"
            >
              Zurück zum Feed
            </button>
          </div>
        ) : (
          <div className="bg-white md:rounded-2xl md:shadow-sm md:border md:border-gray-100 overflow-hidden">
            <FeedCard 
              post={post} 
              currentUserId={currentUserId} 
              showDivider={false} 
              isFirst={true}
            />
          </div>
        )}
      </div>

      <BottomNavigation />
    </main>
  );
}
