"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { FeedCard } from "./feed-card";
import Link from "next/link";
import { ChevronRight, StickyNote } from "lucide-react";
import { useRouter } from "next/navigation";

interface SharedPostMessageProps {
  postId: Id<"posts">;
  currentUserId: Id<"users">;
  isMe: boolean;
}

export function SharedPostMessage({ postId, currentUserId, isMe }: SharedPostMessageProps) {
  const router = useRouter();
  const post = useQuery(api.queries.getPost, {
    postId,
    userId: currentUserId
  });

  if (post === undefined) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl w-full min-h-[100px] border border-gray-100">
        <span className="text-sm text-gray-500">Lade Beitrag...</span>
      </div>
    );
  }

  if (post === null || !post.user) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl w-full border border-gray-100">
        <span className="text-sm text-gray-500 italic">Dieser Beitrag ist nicht mehr verfügbar.</span>
      </div>
    );
  }

  // Map hasLiked to isLiked for FeedCard compatibility
  const mappedPost = {
    ...post,
    isLiked: post.hasLiked
  };

  return (
    <div
      onClick={() => router.push(`/posts/${postId}`)}
      className="flex flex-col w-full max-w-[320px] sm:max-w-[360px] bg-white rounded-2xl overflow-hidden mt-1 cursor-pointer"
    >
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <StickyNote size={12} className="text-[#D08945] flex-shrink-0" />
          <span className="text-[10px] font-bold text-[#D08945] uppercase tracking-wider">Geteilter Beitrag</span>
        </div>
      </div>

      <div className="pointer-events-none pb-2">
        <FeedCard
          post={mappedPost as any}
          currentUserId={currentUserId}
          showDivider={false}
          hideActions={true}
        />
      </div>
    </div>
  );
}
