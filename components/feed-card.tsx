"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

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
      username?: string;
      image?: string;
      uni_name?: string;
      major?: string;
    } | null;
    isLiked?: boolean; // Like-Status direkt aus getFeed Query (verhindert Flicker)
  };
  currentUserId?: Id<"users">;
  showDivider?: boolean; // Zeigt Trennlinie nach den Buttons an
}

export function FeedCard({ post, currentUserId, showDivider = true }: FeedCardProps) {
  const likePost = useMutation(api.mutations.likePost);

  const storageKey = currentUserId ? `like_${post._id}_${currentUserId}` : null;
  
  const getStoredLikeState = (): boolean | null => {
    if (!storageKey || typeof window === "undefined") return null;
    const localStored = localStorage.getItem(storageKey);
    if (localStored === "true" || localStored === "false") return localStored === "true";
    const stored = sessionStorage.getItem(storageKey);
    if (stored === "true" || stored === "false") return stored === "true";
    return null;
  };

  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(getStoredLikeState);
  const [isLiking, setIsLiking] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const lastKnownLikedState = useRef<boolean | null>(getStoredLikeState());

  const isLikedFromQuery = useQuery(
    api.queries.getUserLikes,
    currentUserId && post._id && post.isLiked === undefined
      ? { userId: currentUserId, postId: post._id }
      : "skip"
  );

  const isLiked = post.isLiked !== undefined ? post.isLiked : isLikedFromQuery;

  useEffect(() => {
    if (isLiked !== undefined) {
      lastKnownLikedState.current = isLiked;
      if (optimisticLiked === null) {
        setOptimisticLiked(isLiked);
      } else if (optimisticLiked !== isLiked) {
        setOptimisticLiked(isLiked);
      } else {
        const timeout = setTimeout(() => setOptimisticLiked(null), 100);
        return () => clearTimeout(timeout);
      }
    } else if (optimisticLiked === null && lastKnownLikedState.current !== null) {
      setOptimisticLiked(lastKnownLikedState.current);
    }
  }, [isLiked, optimisticLiked]);

  const displayIsLiked = isLiked !== undefined
    ? isLiked
    : (optimisticLiked !== null ? optimisticLiked : (lastKnownLikedState.current ?? false));

  const handleLike = async () => {
    if (!currentUserId || isLiking) return;
    setIsLiking(true);
    const wasLiked = isLiked ?? false;
    setOptimisticLiked(!wasLiked);
    try {
      await likePost({ userId: currentUserId, postId: post._id });
    } catch (error) {
      setOptimisticLiked(wasLiked);
      console.error("Error liking post:", error);
    } finally {
      setIsLiking(false);
    }
  };

  useEffect(() => {
    if (!storageKey) return;
    const value = optimisticLiked !== null ? optimisticLiked : isLiked;
    if (value !== undefined) {
      const str = value.toString();
      localStorage.setItem(storageKey, str);
      sessionStorage.setItem(storageKey, str);
    }
  }, [optimisticLiked, isLiked, storageKey]);

  if (!post.user) return null;

  return (
    <article
      className="relative px-4 py-3"
      style={{
        marginBottom: "0",
        borderBottom: showDivider ? "1px solid rgba(0, 0, 0, 0.1)" : "none"
      }}
    >
      <div
        className="flex items-start gap-4"
      >
        {post.user?.username ? (
          <Link
            href={`/profile/${post.user.username}`}
            className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <Avatar
              style={{
                height: "56px",
                width: "56px"
              }}
            >
              <AvatarImage src={post.user.image} alt={post.user.name} />
              <AvatarFallback
                className="font-semibold"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.2)",
                  color: "#000000"
                }}
              >
                {post.user.name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <div className="flex-shrink-0">
            <Avatar
              style={{
                height: "56px",
                width: "56px"
              }}
            >
              <AvatarImage src={post.user?.image} alt={post.user?.name} />
              <AvatarFallback
                className="font-semibold"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.2)",
                  color: "#000000"
                }}
              >
                {post.user?.name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {post.user?.username ? (
              <Link
                href={`/profile/${post.user.username}`}
                className="cursor-pointer hover:opacity-80 transition-opacity text-left"
              >
                <h3 className="font-semibold leading-snug inline text-[15px] text-black">
                  {post.user.name}
                </h3>
                {post.user.username && (
                  <span className="leading-tight ml-2 text-[15px] text-black/60">
                    @{post.user.username}
                  </span>
                )}
              </Link>
            ) : (
              <div className="text-left">
                <h3 className="font-semibold leading-snug inline text-[15px] text-black">
                  {post.user?.name}
                </h3>
              </div>
            )}
            <time className="whitespace-nowrap ml-auto text-[11px] text-black/60">
              {formatTimeAgo(post.createdAt)}
            </time>
          </div>
          <p className="mb-3 whitespace-pre-wrap text-[14px] leading-[1.6] text-black">
            {post.content}
          </p>
          {post.imageUrl && (
            <div className="mb-3 w-full rounded-2xl overflow-hidden flex items-center justify-center bg-black/10" style={{ maxHeight: "600px", minHeight: "200px" }}>
              <img
                ref={imgRef}
                src={post.imageUrl}
                alt="Post image"
                className="max-w-full max-h-full rounded-2xl block"
                style={{ objectFit: "contain" }}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}
          <div className="flex items-center mt-3">
            <button
              onClick={handleLike}
              disabled={!currentUserId || isLiking}
              className="flex items-center gap-2 h-10 px-0 font-medium disabled:opacity-50 flex-shrink-0"
              style={{ color: displayIsLiked ? "#f87171" : "#000000", minWidth: "60px" }}
            >
              <Heart style={{ height: "18px", width: "18px", fill: displayIsLiked ? "currentColor" : "none" }} />
              <span className="text-[13px] tabular-nums">{post.likesCount}</span>
            </button>
            <button className="flex items-center gap-2 h-10 px-0 font-medium cursor-pointer flex-shrink-0 ml-12" style={{ color: "var(--color-text-beige)", minWidth: "60px" }}>
              <MessageCircle style={{ height: "18px", width: "18px" }} />
              <span className="text-[13px] tabular-nums">{post.commentsCount}</span>
            </button>
          </div>
          </div>
      </div>
    </article>
  );
}

