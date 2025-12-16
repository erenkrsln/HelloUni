"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Bookmark, Calendar, Users, Tag } from "lucide-react";
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
    postType?: "normal" | "spontaneous_meeting" | "recurring_meeting" | "announcement" | "poll";
    title?: string;
    content: string;
    imageUrl?: string;
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
    } | null;
    isLiked?: boolean; // Like-Status direkt aus getFeed Query (verhindert Flicker)
  };
  currentUserId?: Id<"users">;
  showDivider?: boolean; // Zeigt Trennlinie nach den Buttons an
}

export function FeedCard({ post, currentUserId, showDivider = true }: FeedCardProps) {
  const likePost = useMutation(api.mutations.likePost);

  // Render content with clickable mentions
  const renderContentWithMentions = (content: string) => {
    if (!content) return content;
    
    // Match @username (word characters after @)
    const mentionRegex = /@(\w+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let keyCounter = 0;
    
    // Use matchAll for better compatibility
    const matches = Array.from(content.matchAll(mentionRegex));
    
    if (matches.length === 0) {
      // No mentions found, return content as-is
      return content;
    }
    
    matches.forEach((match) => {
      if (match.index === undefined) return;
      
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${keyCounter++}`}>
            {content.substring(lastIndex, match.index)}
          </span>
        );
      }
      
      // Add mention as link
      const username = match[1];
      parts.push(
        <Link
          key={`mention-${keyCounter++}`}
          href={`/profile/${username}`}
          prefetch={true}
          className="text-[#D08945] cursor-pointer transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          @{username}
        </Link>
      );
      
      lastIndex = match.index + match[0].length;
    });
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${keyCounter++}`}>
          {content.substring(lastIndex)}
        </span>
      );
    }
    
    return <>{parts}</>;
  };
  const joinEvent = useMutation(api.mutations.joinEvent);
  const leaveEvent = useMutation(api.mutations.leaveEvent);
  const votePoll = useMutation(api.mutations.votePoll);
  
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

  const displayIsLiked = optimisticLiked !== null
    ? optimisticLiked
    : (isLiked !== undefined ? isLiked : (lastKnownLikedState.current ?? false));

  const handleLike = async () => {
    if (!currentUserId || isLiking) return;
    setIsLiking(true);
    const wasLiked = displayIsLiked;
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
      case "spontaneous_meeting": return "Spontanes Treffen";
      case "recurring_meeting": return "Wiederkehrendes Treffen";
      case "announcement": return "Ankündigung";
      case "poll": return "Umfrage";
      default: return null;
    }
  };

  const formatEventDate = (timestamp?: number) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
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
            <Avatar className="w-12 h-12 rounded-full">
              <AvatarImage src={post.user.image} alt={post.user.name} className="object-cover" />
              <AvatarFallback
                className="font-semibold rounded-full"
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
            <Avatar className="w-12 h-12 rounded-full">
              <AvatarImage src={post.user?.image} alt={post.user?.name} className="object-cover" />
              <AvatarFallback
                className="font-semibold rounded-full"
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
          <div className="flex items-center gap-1 mb-1 min-w-0">
            {post.user?.username ? (
              <>
              <Link
                href={`/profile/${post.user.username}`}
                prefetch={true}
                  className="cursor-pointer hover:opacity-80 transition-opacity flex items-center min-w-0 flex-shrink"
              >
                  <h3 className="font-bold text-[15px] text-gray-900 truncate max-w-[200px]">
                  {post.user.name}
                </h3>
                </Link>
                <span className="text-[15px] text-gray-500 font-normal whitespace-nowrap flex-shrink-0">
                    @{post.user.username}
                  </span>
              </>
            ) : (
              <div className="flex items-center min-w-0 flex-shrink">
                <h3 className="font-bold text-[15px] text-gray-900 truncate max-w-[200px]">
                  {post.user?.name}
                </h3>
              </div>
            )}
            <span className="text-gray-500 mx-0.5 text-[15px] flex-shrink-0">·</span>
            <time className="whitespace-nowrap text-[15px] text-gray-500 font-normal flex-shrink-0">
              {timeAgo}
            </time>
          </div>
          
          {/* Post Type Badge */}
          {post.postType && getPostTypeLabel(post.postType) && (
            <div className="mb-2 -ml-1">
              <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
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

          {/* Event Details */}
          {(post.postType === "spontaneous_meeting" || post.postType === "recurring_meeting") && (
            <div className="mb-3 space-y-1">
              {post.eventDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{formatEventDate(post.eventDate)}</span>
                  {post.eventTime && <span>um {post.eventTime} Uhr</span>}
                </div>
              )}
              {(post.participantLimit || post.participantsCount !== undefined) && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>
                    {post.participantsCount || 0}
                    {post.participantLimit && ` / ${post.participantLimit}`} Teilnehmer
                  </span>
                </div>
              )}
              {post.recurrencePattern && (
                <div className="text-sm text-gray-600">
                  Wiederholung: {post.recurrencePattern}
                </div>
              )}
            </div>
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

          <p className="text-[15px] text-gray-900 leading-normal whitespace-pre-wrap">
            {renderContentWithMentions(post.content)}
          </p>

          {/* Poll Options */}
          {post.postType === "poll" && post.pollOptions && (
            <div className="mt-3 space-y-2">
              {post.pollOptions.map((option, index) => {
                // Ensure pollResults is always an array with correct length
                const resultsArray = pollResults && Array.isArray(pollResults) 
                  ? pollResults 
                  : new Array(post.pollOptions?.length || 0).fill(0);
                
                // Ensure index is within bounds
                const voteCount = index >= 0 && index < resultsArray.length 
                  ? (resultsArray[index] || 0) 
                  : 0;
                
                // Calculate total votes safely
                const totalVotes = resultsArray.reduce((sum, count) => {
                  const num = typeof count === 'number' ? count : 0;
                  return sum + (isNaN(num) ? 0 : num);
                }, 0);
                
                // Calculate percentage safely
                const percentage = totalVotes > 0 && !isNaN(voteCount) && !isNaN(totalVotes)
                  ? (voteCount / totalVotes) * 100
                  : 0;
                
                const isSelected = pollVote === index;

                return (
                  <button
                    key={index}
                    onClick={() => handleVotePoll(index)}
                    disabled={isVoting}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{option}</span>
                      {totalVotes > 0 && (
                        <span className="text-xs text-gray-500">
                          {voteCount} ({Math.round(percentage)}%)
                        </span>
                      )}
                    </div>
                    {totalVotes > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {post.imageUrl && (
            <div className="mt-3 w-full rounded-2xl overflow-hidden border border-gray-200">
              <img
                ref={imgRef}
                src={post.imageUrl}
                alt="Post image"
                className="w-full h-auto object-cover rounded-2xl"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}

          {/* Join Event Button */}
          {(post.postType === "spontaneous_meeting" || post.postType === "recurring_meeting") && currentUserId && (
            <div className="mt-3">
              <button
                onClick={handleJoinEvent}
                disabled={isJoining || (post.participantLimit !== undefined && (post.participantsCount || 0) >= post.participantLimit && !isParticipating)}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                  isParticipating
                    ? "bg-red-500 text-white hover:bg-red-600 hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none shadow-md"
                    : "bg-green-500 text-white hover:bg-green-600 hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none shadow-md"
                }`}
              >
                {isJoining
                  ? "Wird verarbeitet..."
                  : isParticipating
                  ? "Teilnahme zurückziehen"
                  : "Teilnehmen"}
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-3 max-w-[80%]">
            <button
              onClick={handleLike}
              disabled={!currentUserId || isLiking}
              className="flex items-center gap-1 h-10 px-0 font-normal disabled:opacity-50 flex-shrink-0 group rounded-full transition-colors outline-none focus:outline-none active:outline-none touch-manipulation"
              onTouchEnd={(e) => {
                // Prevent focus on mobile after touch
                e.currentTarget.blur();
              }}
            >
              <Heart 
                className={displayIsLiked ? "text-red-500" : "text-gray-500 group-hover:text-red-500"} 
                style={{ height: "18px", width: "18px", minHeight: "18px", minWidth: "18px", fill: displayIsLiked ? "currentColor" : "none" }} 
              />
              <span className={`text-[13px] tabular-nums inline-block min-w-[1.5ch] ${displayIsLiked ? "text-red-500" : "text-gray-500 group-hover:text-red-500"}`}>
                {post.likesCount > 0 ? post.likesCount : <span className="invisible">0</span>}
              </span>
            </button>
            <button className="flex items-center gap-1 h-10 px-0 font-normal cursor-pointer flex-shrink-0 group rounded-full transition-colors">
              <MessageCircle className="text-gray-500 group-hover:text-blue-500" style={{ height: "18px", width: "18px", minHeight: "18px", minWidth: "18px" }} />
              <span className="text-[13px] tabular-nums inline-block min-w-[1.5ch] text-gray-500 group-hover:text-blue-500">
                {post.commentsCount > 0 ? post.commentsCount : <span className="invisible">0</span>}
              </span>
            </button>
            <button className="flex items-center gap-1 h-10 px-0 font-normal cursor-pointer flex-shrink-0 group rounded-full transition-colors">
              <Bookmark className="text-gray-500 group-hover:text-blue-500" style={{ height: "18px", width: "18px", minHeight: "18px", minWidth: "18px" }} />
              <span className="text-[13px] tabular-nums inline-block min-w-[1.5ch] invisible">
                0
              </span>
            </button>
          </div>
          </div>
      </div>
    </article>
  );
}

