"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
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
    isLiked?: boolean; // Like-Status direkt aus getFeed Query (verhindert Flicker)
  };
  currentUserId?: Id<"users">;
}

export function FeedCard({ post, currentUserId }: FeedCardProps) {
  const likePost = useMutation(api.mutations.likePost);
  
  // Initialisiere optimistischen State sofort aus sessionStorage, um Flickern zu vermeiden
  const storageKey = currentUserId ? `like_${post._id}_${currentUserId}` : null;
  const getInitialOptimisticLiked = (): boolean | null => {
    if (!storageKey || typeof window === "undefined") return null;
    const stored = sessionStorage.getItem(storageKey);
    if (stored === "true" || stored === "false") {
      return stored === "true";
    }
    return null;
  };
  
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(getInitialOptimisticLiked);
  const [isLiking, setIsLiking] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  
  // Initialisiere lastKnownLikedState sofort aus sessionStorage beim ersten Laden
  const getInitialLastKnownState = (): boolean | null => {
    if (!storageKey || typeof window === "undefined") return null;
    const stored = sessionStorage.getItem(storageKey);
    if (stored === "true") return true;
    if (stored === "false") return false;
    return null;
  };
  const lastKnownLikedState = useRef<boolean | null>(getInitialLastKnownState());

  // Verwende Like-Status aus Post-Daten (wenn verfügbar), sonst separate Query
  // post.isLiked kommt direkt aus getUserLikesBatch Query und verhindert Flicker beim ersten Render
  const isLikedFromQuery = useQuery(
    api.queries.getUserLikes,
    // Nur Query ausführen, wenn post.isLiked nicht verfügbar ist (Fallback)
    currentUserId && post._id && post.isLiked === undefined
      ? { userId: currentUserId, postId: post._id }
      : "skip"
  );
  
  // Priorisiere post.isLiked (aus Batch-Query), dann Query-Ergebnis
  const isLiked = post.isLiked !== undefined ? post.isLiked : isLikedFromQuery;

  // Synchronisiere optimistischen State mit Query-Daten
  // Da post.isLiked jetzt direkt aus getFeed kommt, ist isLiked beim ersten Render verfügbar
  useEffect(() => {
    if (isLiked !== undefined) {
      lastKnownLikedState.current = isLiked;
      
      // Wenn optimisticLiked null ist, setze es auf den Query-Wert (beim ersten Render)
      if (optimisticLiked === null) {
        setOptimisticLiked(isLiked);
      } 
      // Wenn optimistischer State nicht mit Query-Daten übereinstimmt, aktualisiere ihn
      else if (optimisticLiked !== isLiked) {
        setOptimisticLiked(isLiked);
      } 
      // Wenn optimistischer State mit Query-Daten übereinstimmt, können wir ihn nach kurzer Verzögerung zurücksetzen
      else {
        const timeout = setTimeout(() => {
          setOptimisticLiked(null);
        }, 100);
        return () => clearTimeout(timeout);
      }
    }
    // Fallback: Wenn Query-Daten noch nicht geladen sind, verwende sessionStorage
    else if (optimisticLiked === null && lastKnownLikedState.current !== null) {
      setOptimisticLiked(lastKnownLikedState.current);
    }
  }, [isLiked, optimisticLiked, storageKey]);

  // Verwende optimistischen State nur für den visuellen Status (gefüllt/nicht gefüllt)
  // Die Like-Anzahl kommt immer direkt aus post.likesCount, da sie bereits vom Backend aktualisiert wurde
  const displayLikes = post.likesCount;
  
  // Bestimme den Like-Status: Priorisiere Query-Daten (isLiked), dann optimistischen State
  // Da post.isLiked jetzt direkt aus getFeed kommt, ist isLiked beim ersten Render verfügbar
  // und verhindert den "weiß → rot" Flicker
  const displayIsLiked = isLiked !== undefined 
    ? isLiked 
    : (optimisticLiked !== null 
        ? optimisticLiked 
        : (lastKnownLikedState.current ?? false));

  const handleLike = async () => {
    if (!currentUserId || isLiking) return;

    setIsLiking(true);
    const wasLiked = isLiked ?? false;
    const newLikedState = !wasLiked;

    setOptimisticLiked(newLikedState);
    // Keine optimistische Like-Anzahl mehr - post.likesCount wird automatisch vom Backend aktualisiert

    try {
      await likePost({
        userId: currentUserId,
        postId: post._id,
      });
      // post.likesCount wird automatisch durch Convex's reaktive Updates aktualisiert
    } catch (error) {
      setOptimisticLiked(wasLiked);
      console.error("Error liking post:", error);
    } finally {
      setIsLiking(false);
      // Setze optimistischen State nicht automatisch zurück
      // Er wird zurückgesetzt, wenn Query-Daten geladen sind (siehe useEffect)
    }
  };

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Speichere optimistischen State in sessionStorage
  useEffect(() => {
    if (!storageKey) return;
    if (optimisticLiked !== null) {
      sessionStorage.setItem(storageKey, optimisticLiked.toString());
    } else if (isLiked !== undefined) {
      // Wenn Query-Daten geladen sind, aktualisiere sessionStorage
      sessionStorage.setItem(storageKey, isLiked.toString());
    }
  }, [optimisticLiked, isLiked, storageKey]);

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
          <div 
            className="mb-4 w-full rounded-2xl overflow-hidden flex items-center justify-center"
            style={{
              maxHeight: "600px",
              minHeight: "200px",
              backgroundColor: "rgba(0, 0, 0, 0.1)",
              borderRadius: "16px"
            }}
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

