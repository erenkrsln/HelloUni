"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Tag } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import { renderContentWithMentions } from "@/lib/mentions";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { PostMenu } from "./post-menu";
import { PostActions } from "./post-actions";
import { PollOptions } from "./poll-options";
import { EventDetails } from "./event-details";
import { CommentDrawer } from "./comment-drawer";
import { PostImageGrid } from "@/components/post-image-grid";
import { ImageLightbox } from "@/components/image-lightbox";

interface FeedCardProps {
  post: {
    _id: Id<"posts">;
    userId: Id<"users">;
    postType?: "normal" | "spontaneous_meeting" | "recurring_meeting" | "announcement" | "poll";
    title?: string;
    content: string;
    imageUrls?: string[]; // Array von Bild-URLs (für Multi-Image Support)
    imageUrl?: string; // Legacy: Einzelnes Bild für Rückwärtskompatibilität
    imageDimensions?: Array<{ width: number; height: number }>; // Array von Bilddimensionen (parallel zu imageUrls)
    eventDate?: number;
    eventTime?: string;
    participantLimit?: number;
    recurrencePattern?: string;
    pollOptions?: string[];
    tags?: string[];
    mentions?: string[];
    likesCount: number;
    commentsCount: number;
    participantsCount?: number;
    createdAt: number;
    user: {
      _id: Id<"users">;
      name: string;
      username?: string;
      image?: string;
      uni_name?: string;
      major?: string;
      semester?: number;
    } | null;
    isLiked?: boolean; // Like-Status direkt aus getFeed Query (verhindert Flicker)
  };
  currentUserId?: Id<"users">;
  showDivider?: boolean; // Zeigt Trennlinie nach den Buttons an
  imagePriority?: boolean; // Für Next.js Image priority (erste Posts im Feed)
}

// Helper to remove degree titles
const cleanMajor = (major?: string) => {
  if (!major) return undefined;
  // Removes B.Eng, B.Sc, B.A, M.Sc, M.A, M.Eng, LL.B, LL.M (case insensitive, with or without dots/parentheses)
  return major.replace(/\s*\(?\b(B\.?Eng|B\.?Sc|B\.?A|M\.?Sc|M\.?A|M\.?Eng|LL\.?B|LL\.?M)\.?\)?\s*/gi, "").trim();
};

export function FeedCard({ post, currentUserId, showDivider = true, imagePriority = false }: FeedCardProps) {
  const likePost = useMutation(api.mutations.likePost);
  const isOwnPost = currentUserId && post.userId === currentUserId;
  const joinEvent = useMutation(api.mutations.joinEvent);
  const leaveEvent = useMutation(api.mutations.leaveEvent);
  const votePoll = useMutation(api.mutations.votePoll);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Lightbox State
  const [lightboxImageIndex, setLightboxImageIndex] = useState<number | null>(null);

  // Berechne Array aller Bilder für Lightbox
  const allImages = post.imageUrls && post.imageUrls.length > 0
    ? post.imageUrls
    : post.imageUrl
      ? [post.imageUrl]
      : [];

  // Store time ago string on mount - only updates when component remounts (e.g. navigating to /home)
  const [timeAgo, setTimeAgo] = useState(() => formatTimeAgo(post.createdAt));

  // Update time ago only on mount or when post changes
  useEffect(() => {
    setTimeAgo(formatTimeAgo(post.createdAt));
  }, [post.createdAt]);

  // Check participation status for events
  const isParticipatingFromQuery = useQuery(
    api.queries.isParticipating,
    currentUserId && (post.postType === "spontaneous_meeting" || post.postType === "recurring_meeting")
      ? { userId: currentUserId, postId: post._id }
      : "skip"
  );

  // Get poll vote and results
  const pollVoteFromQuery = useQuery(
    api.queries.getPollVote,
    currentUserId && post.postType === "poll"
      ? { userId: currentUserId, postId: post._id }
      : "skip"
  );

  const pollResultsFromQuery = useQuery(
    api.queries.getPollResults,
    post.postType === "poll" ? { postId: post._id } : "skip"
  );


  const pollVoteStorageKey = currentUserId && post.postType === "poll"
    ? `pollVote_${post._id}_${currentUserId}`
    : null;

  const pollResultsStorageKey = post.postType === "poll"
    ? `pollResults_${post._id}`
    : null;

  const getStoredPollResultsState = (): number[] | null => {
    if (!pollResultsStorageKey || typeof window === "undefined") return null;
    const localStored = localStorage.getItem(pollResultsStorageKey);
    if (localStored) {
      try {
        const parsed = JSON.parse(localStored);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
    const stored = sessionStorage.getItem(pollResultsStorageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
    return null;
  };

  const [optimisticPollResults, setOptimisticPollResults] = useState<number[] | null>(getStoredPollResultsState());
  const lastKnownPollResultsState = useRef<number[] | null>(getStoredPollResultsState());

  useEffect(() => {
    if (pollResultsFromQuery !== undefined && pollResultsFromQuery !== null) {
      // Ensure results array matches pollOptions length
      const normalizedResults = post.pollOptions
        ? pollResultsFromQuery.length === post.pollOptions.length
          ? pollResultsFromQuery
          : [...pollResultsFromQuery, ...new Array(Math.max(0, post.pollOptions.length - pollResultsFromQuery.length)).fill(0)]
        : pollResultsFromQuery;

      lastKnownPollResultsState.current = normalizedResults;

      // Only update if we don't have optimistic results
      // This prevents overwriting optimistic updates when user is switching options
      if (optimisticPollResults === null) {
        setOptimisticPollResults(normalizedResults);
      } else {
        // Only update if the query results are significantly different (more than 1 vote difference)
        // This means server has new data from other users, not just our optimistic update
        const optimisticTotal = optimisticPollResults.reduce((a, b) => a + b, 0);
        const queryTotal = normalizedResults.reduce((a, b) => a + b, 0);

        // If totals are very different, update (server has new data from other users)
        // Otherwise, keep optimistic state (user is switching options)
        if (Math.abs(optimisticTotal - queryTotal) > 1) {
          setOptimisticPollResults(normalizedResults);
        }
      }
    } else if (optimisticPollResults === null && lastKnownPollResultsState.current !== null) {
      setOptimisticPollResults(lastKnownPollResultsState.current);
    } else if (optimisticPollResults === null && lastKnownPollResultsState.current === null && post.pollOptions) {
      // Initialize with zeros if no results exist yet
      const initialResults = new Array(post.pollOptions.length).fill(0);
      setOptimisticPollResults(initialResults);
      lastKnownPollResultsState.current = initialResults;
    }
  }, [pollResultsFromQuery, optimisticPollResults, post.pollOptions]);

  const pollResults = optimisticPollResults !== null
    ? optimisticPollResults
    : (pollResultsFromQuery !== undefined && pollResultsFromQuery !== null
      ? pollResultsFromQuery
      : (lastKnownPollResultsState.current ?? (post.pollOptions ? new Array(post.pollOptions.length).fill(0) : null)));

  useEffect(() => {
    if (!pollResultsStorageKey) return;
    const value = optimisticPollResults !== null ? optimisticPollResults : pollResultsFromQuery;
    if (value !== undefined && value !== null && Array.isArray(value)) {
      localStorage.setItem(pollResultsStorageKey, JSON.stringify(value));
      sessionStorage.setItem(pollResultsStorageKey, JSON.stringify(value));
    }
  }, [optimisticPollResults, pollResultsFromQuery, pollResultsStorageKey]);

  const getStoredPollVoteState = (): number | null => {
    if (!pollVoteStorageKey || typeof window === "undefined") return null;
    const localStored = localStorage.getItem(pollVoteStorageKey);
    if (localStored !== null && localStored !== "") {
      const parsed = parseInt(localStored, 10);
      if (!isNaN(parsed)) return parsed;
    }
    const stored = sessionStorage.getItem(pollVoteStorageKey);
    if (stored !== null && stored !== "") {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return null;
  };

  const [optimisticPollVote, setOptimisticPollVote] = useState<number | null>(getStoredPollVoteState());
  const lastKnownPollVoteState = useRef<number | null>(getStoredPollVoteState());

  useEffect(() => {
    if (pollVoteFromQuery !== undefined) {
      if (pollVoteFromQuery !== null) {
        lastKnownPollVoteState.current = pollVoteFromQuery;
        if (optimisticPollVote === null) {
          setOptimisticPollVote(pollVoteFromQuery);
        } else if (optimisticPollVote !== pollVoteFromQuery) {
          setOptimisticPollVote(pollVoteFromQuery);
        }
      } else {
        // Query returned null (no vote)
        lastKnownPollVoteState.current = null;
        // Only clear optimistic if we had no previous state
        if (optimisticPollVote !== null && lastKnownPollVoteState.current === null) {
          // Keep optimistic state for now, will be cleared when confirmed
        }
      }
    } else if (optimisticPollVote === null && lastKnownPollVoteState.current !== null) {
      setOptimisticPollVote(lastKnownPollVoteState.current);
    }
  }, [pollVoteFromQuery, optimisticPollVote]);

  const pollVote = optimisticPollVote !== null
    ? optimisticPollVote
    : (pollVoteFromQuery !== undefined ? pollVoteFromQuery : (lastKnownPollVoteState.current ?? null));

  useEffect(() => {
    if (!pollVoteStorageKey) return;
    const value = optimisticPollVote !== null ? optimisticPollVote : pollVoteFromQuery;
    if (value !== undefined && value !== null) {
      const str = value.toString();
      localStorage.setItem(pollVoteStorageKey, str);
      sessionStorage.setItem(pollVoteStorageKey, str);
    } else if (value === null && pollVoteFromQuery === null) {
      // Only clear if query confirms no vote
      localStorage.removeItem(pollVoteStorageKey);
      sessionStorage.removeItem(pollVoteStorageKey);
    }
  }, [optimisticPollVote, pollVoteFromQuery, pollVoteStorageKey]);

  const [isJoining, setIsJoining] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  const storageKey = currentUserId ? `like_${post._id}_${currentUserId}` : null;
  const participationStorageKey = currentUserId && (post.postType === "spontaneous_meeting" || post.postType === "recurring_meeting")
    ? `participation_${post._id}_${currentUserId}`
    : null;

  const getStoredParticipationState = (): boolean | null => {
    if (!participationStorageKey || typeof window === "undefined") return null;
    const localStored = localStorage.getItem(participationStorageKey);
    if (localStored === "true" || localStored === "false") return localStored === "true";
    const stored = sessionStorage.getItem(participationStorageKey);
    if (stored === "true" || stored === "false") return stored === "true";
    return null;
  };

  const [optimisticParticipating, setOptimisticParticipating] = useState<boolean | null>(getStoredParticipationState);
  const lastKnownParticipationState = useRef<boolean | null>(getStoredParticipationState());

  const isParticipating = isParticipatingFromQuery !== undefined ? isParticipatingFromQuery : (optimisticParticipating !== null ? optimisticParticipating : (lastKnownParticipationState.current ?? false));

  useEffect(() => {
    if (isParticipatingFromQuery !== undefined) {
      lastKnownParticipationState.current = isParticipatingFromQuery;
      if (optimisticParticipating === null) {
        setOptimisticParticipating(isParticipatingFromQuery);
      } else if (optimisticParticipating !== isParticipatingFromQuery) {
        setOptimisticParticipating(isParticipatingFromQuery);
      }
    } else if (optimisticParticipating === null && lastKnownParticipationState.current !== null) {
      setOptimisticParticipating(lastKnownParticipationState.current);
    }
  }, [isParticipatingFromQuery, optimisticParticipating]);

  useEffect(() => {
    if (!participationStorageKey) return;
    const value = optimisticParticipating !== null ? optimisticParticipating : isParticipatingFromQuery;
    if (value !== undefined) {
      const str = value.toString();
      localStorage.setItem(participationStorageKey, str);
      sessionStorage.setItem(participationStorageKey, str);
    }
  }, [optimisticParticipating, isParticipatingFromQuery, participationStorageKey]);

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
  const lastKnownLikedState = useRef<boolean | null>(getStoredLikeState());

  const isLikedFromQuery = useQuery(
    api.queries.getUserLikes,
    currentUserId && post._id && post.isLiked === undefined
      ? { userId: currentUserId, postId: post._id }
      : "skip"
  );

  const isLiked = post.isLiked !== undefined ? post.isLiked : isLikedFromQuery;

  useEffect(() => {
    // Don't override optimistic state if we're currently liking/unliking
    if (isLiking) return;

    if (isLiked !== undefined) {
      lastKnownLikedState.current = isLiked;
      if (optimisticLiked === null) {
        setOptimisticLiked(isLiked);
      } else if (optimisticLiked !== isLiked) {
        // Only update if the server state differs from our optimistic state
        // This means the server has confirmed our action
        setOptimisticLiked(isLiked);
      }
    } else if (optimisticLiked === null && lastKnownLikedState.current !== null) {
      setOptimisticLiked(lastKnownLikedState.current);
    }
  }, [isLiked, optimisticLiked, isLiking]);

  const displayIsLiked = isLiked !== undefined
    ? isLiked
    : (optimisticLiked !== null ? optimisticLiked : (lastKnownLikedState.current ?? false));

  const handleLike = async () => {
    if (!currentUserId || isLiking) return;

    // Use displayIsLiked to get the current state (includes optimistic updates)
    const wasLiked = displayIsLiked;
    const newLikedState = !wasLiked;

    // Optimistic update immediately - no delay
    setOptimisticLiked(newLikedState);
    setIsLiking(true);

    try {
      await likePost({ userId: currentUserId, postId: post._id });
      // Update lastKnownState after successful like
      lastKnownLikedState.current = newLikedState;
    } catch (error) {
      // Revert on error
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


  const handleJoinEvent = async () => {
    if (!currentUserId || isJoining) return;
    setIsJoining(true);
    const wasParticipating = optimisticParticipating !== null ? optimisticParticipating : (isParticipatingFromQuery ?? false);
    setOptimisticParticipating(!wasParticipating);
    try {
      if (wasParticipating) {
        await leaveEvent({ userId: currentUserId, postId: post._id });
      } else {
        await joinEvent({ userId: currentUserId, postId: post._id });
      }
    } catch (error) {
      setOptimisticParticipating(wasParticipating);
      console.error("Error joining/leaving event:", error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleVotePoll = async (optionIndex: number) => {
    if (!currentUserId || isVoting || !post.pollOptions || optionIndex < 0 || optionIndex >= post.pollOptions.length) return;
    setIsVoting(true);

    const previousVote = optimisticPollVote !== null ? optimisticPollVote : (pollVoteFromQuery ?? null);

    // Always use optimistic results as base, not query results, to prevent flickering
    const currentResults = optimisticPollResults !== null
      ? optimisticPollResults
      : (lastKnownPollResultsState.current !== null
        ? lastKnownPollResultsState.current
        : (pollResultsFromQuery !== undefined && pollResultsFromQuery !== null
          ? pollResultsFromQuery
          : null));

    // Ensure results array has correct length
    const normalizedResults = currentResults && Array.isArray(currentResults)
      ? currentResults.length === post.pollOptions.length
        ? currentResults
        : [...currentResults, ...new Array(Math.max(0, post.pollOptions.length - currentResults.length)).fill(0)]
      : new Array(post.pollOptions.length).fill(0);

    const newResults = [...normalizedResults];

    // Remove vote from previous option if exists
    if (previousVote !== null && previousVote >= 0 && previousVote < newResults.length) {
      const prevCount = typeof newResults[previousVote] === 'number' ? newResults[previousVote] : 0;
      newResults[previousVote] = Math.max(0, prevCount - 1);
    }

    // Add vote to new option
    if (optionIndex >= 0 && optionIndex < newResults.length) {
      const currentCount = typeof newResults[optionIndex] === 'number' ? newResults[optionIndex] : 0;
      newResults[optionIndex] = currentCount + 1;
    }

    // Update both vote and results optimistically
    setOptimisticPollVote(optionIndex);
    setOptimisticPollResults(newResults);

    try {
      await votePoll({ userId: currentUserId, postId: post._id, optionIndex });
    } catch (error) {
      // Revert optimistic updates on error
      setOptimisticPollVote(previousVote);
      setOptimisticPollResults(normalizedResults);
      console.error("Error voting:", error);
    } finally {
      setIsVoting(false);
    }
  };

  const getPostTypeLabel = (type?: string) => {
    switch (type) {
      case "normal": return null; // Kein Badge für normale Posts
      case "spontaneous_meeting": return "⚡ Spontanes Treffen";
      case "recurring_meeting": return "📅 Wiederkehrendes Treffen";
      case "announcement": return "📢 Ankündigung";
      case "poll": return "📊 Umfrage";
      default: return null;
    }
  };


  if (!post.user) return null;

  return (
    <article
      className="relative px-4 py-3"
      style={{
        marginBottom: "0",
        borderBottom: showDivider ? "1px solid rgba(0, 0, 0, 0.1)" : "none"
      }}
    >
      <div className="flex items-start gap-3">
        {post.user?.username ? (
          <Link
            href={`/profile/${post.user.username}`}
            prefetch={true}
            className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <UserAvatar
              src={post.user.image}
              alt={post.user.name}
              size="lg"
              fallbackText={post.user.name?.[0]?.toUpperCase() || "U"}
              priority={imagePriority}
            />
          </Link>
        ) : (
          <UserAvatar
            src={post.user?.image}
            alt={post.user?.name || "User"}
            size="lg"
            fallbackText={post.user?.name?.[0]?.toUpperCase() || "U"}
            priority={imagePriority}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1 min-w-0 -mt-1">
            {post.user?.username ? (
              <>
                <Link
                  href={`/profile/${post.user.username}`}
                  prefetch={true}
                  className="cursor-pointer hover:opacity-80 transition-opacity flex items-center flex-shrink-0"
                >
                  <h3 className="font-bold text-[15px] text-gray-900 whitespace-nowrap">
                    {post.user.name}
                  </h3>
                </Link>
                <span className="text-[15px] text-gray-500 font-normal whitespace-nowrap flex-shrink-0">
                  @{post.user.username}
                </span>
              </>
            ) : (
              <div className="flex items-center flex-shrink-0">
                <h3 className="font-bold text-[15px] text-gray-900 whitespace-nowrap">
                  {post.user?.name}
                </h3>
              </div>
            )}
            <span className="text-gray-500 mx-0.5 text-[15px] flex-shrink-0">·</span>
            <time className="whitespace-nowrap text-[15px] text-gray-500 font-normal flex-shrink-0">
              {timeAgo}
            </time>
            <div className="ml-auto mr-2 w-8 h-8 flex items-center justify-center flex-shrink-0">
              {isOwnPost && (
                <PostMenu postId={post._id} userId={currentUserId} />
              )}
            </div>
          </div>

          {/* Major & Semester */}
          {(post.user.major || post.user.semester) && (
            <div className="text-[13px] text-gray-500 -mt-2 mb-3 truncate">
              {cleanMajor(post.user.major)}
              {post.user.major && post.user.semester && " · "}
              {post.user.semester && `${post.user.semester}. Semester`}
            </div>
          )}

          {/* Post Type Badge */}
          {post.postType && getPostTypeLabel(post.postType) && (
            <div className="mb-2 -ml-1">
              <span className="inline-block pl-1 pr-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                {getPostTypeLabel(post.postType)}
              </span>
            </div>
          )}

          {/* Title */}
          {post.title && (
            <h4 className="font-semibold text-[16px] text-gray-900 mb-2">
              {post.title}
            </h4>
          )}

          {/* Content - immer nach Title */}
          {post.content && post.content.trim() && (
            <p className="text-[15px] text-gray-900 leading-normal whitespace-pre-wrap mb-3">
              {renderContentWithMentions(post.content)}
            </p>
          )}

          {/* Event Details */}
          {(post.postType === "spontaneous_meeting" || post.postType === "recurring_meeting") && (
            <EventDetails
              postId={post._id}
              eventDate={post.eventDate}
              eventTime={post.eventTime}
              participantLimit={post.participantLimit}
              participantsCount={post.participantsCount}
              recurrencePattern={post.recurrencePattern}
            />
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {post.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Poll Options */}
          {post.postType === "poll" && post.pollOptions && (
            <PollOptions
              postId={post._id}
              pollOptions={post.pollOptions}
              pollResults={pollResults || []}
              pollVote={pollVote}
              onVote={handleVotePoll}
              isVoting={isVoting}
            />
          )}
          {/* Multi-Image Grid im Twitter-Stil */}
          {allImages.length > 0 && (
            <>
              <PostImageGrid
                images={allImages}
                imageDimensions={post.imageDimensions}
                onImageClick={(index) => {
                  // Öffne Lightbox mit dem angeklickten Bild
                  setLightboxImageIndex(index);
                }}
                priority={imagePriority}
              />

              {/* Image Lightbox */}
              <ImageLightbox
                images={allImages}
                currentIndex={lightboxImageIndex}
                onClose={() => setLightboxImageIndex(null)}
                onImageChange={(newIndex) => setLightboxImageIndex(newIndex)}
              />
            </>
          )}

          {/* Join Event Button */}
          {(post.postType === "spontaneous_meeting" || post.postType === "recurring_meeting") && currentUserId && (
            <div className="mt-3" style={{
              willChange: "transform",
              transform: "translateZ(0)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden"
            }}>
              <button
                onClick={handleJoinEvent}
                disabled={isJoining || (post.participantLimit !== undefined && (post.participantsCount || 0) >= post.participantLimit && !isParticipating)}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${isParticipating
                  ? "bg-red-500 text-white hover:bg-red-600 hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none shadow-md"
                  : "bg-green-500 text-white hover:bg-green-600 hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none shadow-md"
                  }`}
                style={{
                  willChange: "transform",
                  transform: "translateZ(0)",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden"
                }}
              >
                <span style={{
                  display: "inline-block",
                  willChange: "transform",
                  transform: "translateZ(0)",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden"
                }}>
                  {isJoining
                    ? "Wird verarbeitet..."
                    : isParticipating
                      ? "Teilnahme zurückziehen"
                      : "Teilnehmen"}
                </span>
              </button>
            </div>
          )}

          <PostActions
            likesCount={post.likesCount}
            commentsCount={post.commentsCount}
            isLiked={displayIsLiked}
            onLike={handleLike}
            isLiking={isLiking}
            currentUserId={currentUserId}
            onCommentClick={() => setIsDrawerOpen(true)}
          />
        </div>
      </div>

      {/* Comment Drawer */}
      <CommentDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        postId={post._id}
        currentUserId={currentUserId}
        commentsCount={post.commentsCount}
      />
    </article>
  );
}

