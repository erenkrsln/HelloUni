"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Bookmark, X, MoreHorizontal, BarChart3, Repeat2 } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useRef, useEffect } from "react";

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
  };
  currentUserId?: Id<"users">;
}

export function FeedCard({ post, currentUserId }: FeedCardProps) {
  const likePost = useMutation(api.mutations.likePost);
  const [optimisticLikes, setOptimisticLikes] = useState<number | null>(null);
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

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

  // ESC-Taste zum Schließen des Modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isImageModalOpen) {
        setIsImageModalOpen(false);
      }
    };

    if (isImageModalOpen) {
      document.addEventListener("keydown", handleEscape);
      // Verhindere Scrollen im Hintergrund
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isImageModalOpen]);

  if (!post.user) return null;

  return (
    <article
      className="relative mb-6"
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
            {post.user.username && (
              <p
                className="leading-tight mb-1"
                style={{
                  fontSize: "12px",
                  color: "rgba(244, 207, 171, 0.6)"
                }}
              >
                @{post.user.username}
              </p>
            )}
            {(post.user.major || post.user.uni_name) && (
            <p
              className="leading-tight"
              style={{
                fontSize: "13px",
                color: "rgba(244, 207, 171, 0.8)"
              }}
            >
                {post.user.major && post.user.uni_name 
                  ? `${post.user.major} · ${post.user.uni_name}`
                  : post.user.major || post.user.uni_name}
            </p>
            )}
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
          <>
            <div 
              className="mb-4 w-full rounded-2xl overflow-hidden cursor-pointer flex items-center justify-center"
              style={{
                maxHeight: "600px",
                minHeight: "200px",
                backgroundColor: "rgba(0, 0, 0, 0.1)",
                borderRadius: "16px"
              }}
              onClick={() => setIsImageModalOpen(true)}
            >
              <img
                ref={imgRef}
                src={post.imageUrl}
                alt="Post image"
                className="max-w-full max-h-full rounded-2xl"
                style={{ 
                  objectFit: "contain",
                  display: "block"
                }}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = "none";
                }}
              />
            </div>

            {/* Image Modal / Lightbox (wie Twitter/X) */}
            {isImageModalOpen && (
              <div
                className="fixed inset-0 z-50 flex flex-col"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.95)"
                }}
              >
                {/* Top Bar - X links, Menu rechts */}
                <div
                  className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10"
                  style={{
                    background: "linear-gradient(to bottom, rgba(0, 0, 0, 0.7), transparent)"
                  }}
                >
                  <button
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    onClick={() => setIsImageModalOpen(false)}
                    aria-label="Schließen"
                  >
                    <X style={{ width: "24px", height: "24px", color: "white" }} />
                  </button>
                  
                  <button
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Menu öffnen
                    }}
                    aria-label="Mehr Optionen"
                  >
                    <MoreHorizontal style={{ width: "24px", height: "24px", color: "white" }} />
                  </button>
                </div>

                {/* Bild - Zentriert, vollständig sichtbar */}
                <div
                  className="flex-1 flex items-center justify-center p-4"
                  onClick={() => setIsImageModalOpen(false)}
                >
                  <div
                    className="max-w-full max-h-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={post.imageUrl}
                      alt="Post image - Originalgröße"
                      className="max-w-full max-h-full"
                      style={{
                        objectFit: "contain",
                        display: "block"
                      }}
                      loading="eager"
                    />
                  </div>
                </div>

                {/* Bottom Navigation Bar - Interaktions-Icons */}
                <div
                  className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-8 p-4"
                  style={{
                    background: "linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent)"
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    aria-label="Kommentieren"
                  >
                    <MessageCircle style={{ width: "24px", height: "24px", color: "white" }} />
                  </button>
                  
                  <button
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    aria-label="Retweet"
                  >
                    <Repeat2 style={{ width: "24px", height: "24px", color: "white" }} />
                  </button>
                  
                  <button
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike();
                    }}
                    aria-label="Gefällt mir"
                  >
                    <Heart 
                      style={{ 
                        width: "24px", 
                        height: "24px", 
                        color: displayIsLiked ? "#ef4444" : "white",
                        fill: displayIsLiked ? "#ef4444" : "none"
                      }} 
                    />
                  </button>
                  
                  <button
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    aria-label="Ansichten"
                  >
                    <BarChart3 style={{ width: "24px", height: "24px", color: "white" }} />
                  </button>
                  
                  <button
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    aria-label="Teilen"
                  >
                    <Share2 style={{ width: "24px", height: "24px", color: "white" }} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <div
          className="flex items-center gap-6 pt-3"
          style={{ borderTop: "1px solid rgba(244, 207, 171, 0.2)" }}
        >
          <button
            onClick={handleLike}
            disabled={!currentUserId || isLiking}
            className="flex items-center gap-2 h-10 px-0 font-medium transition-all hover:scale-110 disabled:opacity-50"
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
            className="flex items-center gap-2 h-10 px-0 font-medium transition-all hover:scale-110 cursor-pointer"
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

