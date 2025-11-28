"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";

interface FeedCardProps {
  post: {
    _id: Id<"posts">;
    userId: Id<"users">;
    content: string;
    imageUrl?: string;
    likesCount: number;
    commentsCount: number;
    createdAt: number;
    user: {
      _id: Id<"users">;
      name: string;
      image?: string;
      uni_name: string;
      major: string;
    } | null;
  };
  currentUserId?: Id<"users">;
}

export function FeedCard({ post, currentUserId }: FeedCardProps) {
  const likePost = useMutation(api.mutations.likePost);
  const [optimisticLikes, setOptimisticLikes] = useState<number | null>(null);
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [isLiking, setIsLiking] = useState(false);

  const isLiked = useQuery(
    api.queries.getUserLikes,
    currentUserId && post._id
      ? { userId: currentUserId, postId: post._id }
      : "skip"
  );

  const displayLikes = optimisticLikes !== null ? optimisticLikes : post.likesCount;
  const displayIsLiked = optimisticLiked !== null ? optimisticLiked : (isLiked ?? false);

  const handleLike = async () => {
    if (!currentUserId || isLiking) return;

    setIsLiking(true);
    const previousLikes = post.likesCount;
    const wasLiked = isLiked ?? false;
    const newLikedState = !wasLiked;

    setOptimisticLiked(newLikedState);
    setOptimisticLikes(newLikedState ? previousLikes + 1 : previousLikes - 1);

    try {
      await likePost({
        userId: currentUserId,
        postId: post._id,
      });
    } catch (error) {
      setOptimisticLiked(wasLiked);
      setOptimisticLikes(previousLikes);
      console.error("Error liking post:", error);
    } finally {
      setIsLiking(false);
      setTimeout(() => {
        setOptimisticLikes(null);
        setOptimisticLiked(null);
      }, 500);
    }
  };

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  if (!post.user) return null;

  return (
    <article
      className="relative mb-6 transition-transform hover:scale-[1.02]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="backdrop-blur-sm p-5 transition-all hover:bg-white/15"
        style={{
          borderRadius: "var(--border-radius-card)",
          backgroundColor: "rgba(255, 255, 255, 0.1)"
        }}
      >
        <div className="flex items-start gap-4 mb-4">
          <Avatar
            className="border-2"
            style={{
              height: "56px",
              width: "56px",
              borderColor: "rgba(244, 207, 171, 0.3)"
            }}
          >
            <AvatarImage src={post.user.image} alt={post.user.name} />
            <AvatarFallback
              className="font-semibold"
              style={{
                backgroundColor: "rgba(244, 207, 171, 0.2)",
                color: "var(--color-text-beige)"
              }}
            >
              {post.user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold leading-snug mb-0.5"
              style={{
                fontSize: "15px",
                color: "var(--color-text-beige)"
              }}
            >
              {post.user.name}
            </h3>
            <p
              className="leading-tight"
              style={{
                fontSize: "13px",
                color: "rgba(244, 207, 171, 0.8)"
              }}
            >
              {post.user.major} · {post.user.uni_name}
            </p>
          </div>
          <time
            className="whitespace-nowrap ml-auto"
            style={{
              fontSize: "11px",
              color: "rgba(244, 207, 171, 0.6)"
            }}
          >
            {formatTimeAgo(post.createdAt)}
          </time>
        </div>
        <p
          className="mb-4 whitespace-pre-wrap"
          style={{
            fontSize: "14px",
            lineHeight: "1.6",
            color: "var(--color-text-beige)"
          }}
        >
          {post.content}
        </p>

        {post.imageUrl && (
          <div className="mb-4">
            <img
              src={post.imageUrl}
              alt="Post image"
              className="w-full rounded-lg"
              style={{ maxHeight: "400px", objectFit: "cover" }}
            />
          </div>
        )}

        <div
          className="flex items-center gap-6 pt-3"
          style={{ borderTop: "1px solid rgba(244, 207, 171, 0.2)" }}
        >
          <button
            onClick={handleLike}
            disabled={!currentUserId || isLiking}
            className="flex items-center gap-2 h-10 px-0 font-medium transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
            style={{
              color: displayIsLiked ? "#f87171" : "var(--color-text-beige)"
            }}
          >
            <Heart
              className="transition-all"
              style={{
                height: "18px",
                width: "18px",
                fill: displayIsLiked ? "currentColor" : "none"
              }}
            />
            <span style={{ fontSize: "13px" }}>{displayLikes}</span>
          </button>
          <button
            className="flex items-center gap-2 h-10 px-0 font-medium transition-all hover:scale-110 active:scale-95 cursor-pointer"
            style={{ color: "var(--color-text-beige)" }}
          >
            <MessageCircle style={{ height: "18px", width: "18px" }} />
            <span style={{ fontSize: "13px" }}>{post.commentsCount}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

