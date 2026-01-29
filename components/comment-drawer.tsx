"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Heart, MessageCircle, SlidersHorizontal, Check, ThumbsDown } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import { renderContentWithMentions } from "@/lib/mentions";
import { Spinner } from "@/components/ui/spinner";

interface Comment {
  _id: Id<"comments">;
  userId: Id<"users">;
  postId: Id<"posts">;
  parentCommentId?: Id<"comments">;
  content: string;
  imageUrl?: string;
  likesCount: number;
  repliesCount: number;
  createdAt: number;
  isLiked: boolean;
  isDisliked?: boolean;
  user: {
    _id: Id<"users">;
    name: string;
    username?: string;
    image?: string;
  };
}

interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  postId: Id<"posts">;
  currentUserId?: Id<"users">;
  commentsCount: number;
  highlightCommentId?: string;
}

export function CommentDrawer({
  isOpen,
  onClose,
  postId,
  currentUserId,
  commentsCount,
  highlightCommentId,
}: CommentDrawerProps) {
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Id<"comments"> | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optimisticLikes, setOptimisticLikes] = useState<Map<string, boolean>>(new Map());
  const [optimisticDislikes, setOptimisticDislikes] = useState<Map<string, boolean>>(new Map());
  const [sortMode, setSortMode] = useState<"top" | "neueste">("neueste");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const initialHadCommentsRef = useRef<boolean | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false); // Synchroner Check für doppelte Submits
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const processedHighlightRef = useRef<string | null>(null);

  // Store time ago strings for comments - calculated only once per comment
  const timeAgoCacheRef = useRef<Map<string, string>>(new Map());

  // Cache for comments per post - persists across drawer opens/closes
  const commentsCacheRef = useRef<Map<string, Comment[]>>(new Map());
  const hasLoadedCommentsRef = useRef<Set<string>>(new Set());

  const createComment = useMutation(api.mutations.createComment);
  const likeComment = useMutation(api.mutations.likeComment);
  const dislikeComment = useMutation(api.mutations.dislikeComment);

  // Always query comments (even when drawer is closed) to keep cache fresh
  // This prevents flickering when reopening the drawer
  const allCommentsFromQuery = useQuery(
    api.queries.getComments,
    { postId, userId: currentUserId }
  );

  // Cache comments when loaded
  useEffect(() => {
    if (allCommentsFromQuery !== undefined) {
      const postIdStr = postId as string;
      // Filter out any null values and ensure type safety
      const validComments = allCommentsFromQuery.filter((c) => c !== null) as Comment[];
      commentsCacheRef.current.set(postIdStr, validComments);
      hasLoadedCommentsRef.current.add(postIdStr);
    }
  }, [allCommentsFromQuery, postId]);

  // Use cached comments if available, otherwise use query result
  const postIdStr = postId as string;
  const hasCachedComments = hasLoadedCommentsRef.current.has(postIdStr);
  const cachedComments = commentsCacheRef.current.get(postIdStr);

  // Determine which comments to use
  // Priority: Always use cached comments if available (even if query is loading)
  // Only use query result if it's available AND we don't have cached comments, or if query has new data
  let allComments: Comment[] | undefined;
  if (hasCachedComments && cachedComments && cachedComments.length > 0) {
    // We have cached comments - use them immediately, update when query finishes
    allComments = allCommentsFromQuery !== undefined ? allCommentsFromQuery : cachedComments;
  } else if (hasCachedComments && cachedComments && cachedComments.length === 0) {
    // We have cached empty array - use it immediately
    allComments = allCommentsFromQuery !== undefined ? allCommentsFromQuery : cachedComments;
  } else {
    // No cached comments - use query result (might be undefined while loading)
    allComments = allCommentsFromQuery;
  }

  // Show loading spinner only on first load when query is still loading
  // But if commentsCount is 0, we know there are no comments, so don't show loading
  // Also don't show loading if we have cached comments to display
  // Since we always query now, we only show loading if we have no cache AND query is loading AND drawer is open
  const isLoading = !hasCachedComments && allCommentsFromQuery === undefined && isOpen && commentsCount > 0;

  // Get current user data for avatar
  const currentUser = useQuery(
    api.queries.getUserById,
    currentUserId ? { userId: currentUserId } : "skip"
  );

  // Fix height based on initial state when drawer opens
  useEffect(() => {
    if (isOpen && initialHadCommentsRef.current === null) {
      // Set initial state based on commentsCount prop (from post) - only once when opening
      // This fixes the height and prevents it from changing when comments are added
      initialHadCommentsRef.current = commentsCount > 0;
    }
    if (!isOpen) {
      // Reset when drawer closes
      initialHadCommentsRef.current = null;
    }
  }, [isOpen, commentsCount]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [commentText]);

  // VisualViewport API für dynamische Tastatur-Höhe (iOS Standalone) - nur auf mobilen Geräten
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport || !isOpen) return;

    // Nur auf mobilen Geräten aktivieren
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
    if (!isMobile) return;

    const updateDrawerAndInput = () => {
      const viewport = window.visualViewport;
      if (!viewport || !drawerRef.current) return;

      // Berechne die Tastatur-Höhe
      const keyboardHeight = window.innerHeight - viewport.height;

      // Nur wenn Tastatur wirklich offen ist (nicht nur Input fokussiert), nutze viewport.height
      // Das verhindert, dass sich die Höhe auf Desktop ändert, wenn man auf das Eingabefeld klickt
      if (keyboardHeight > 150) {
        // Tastatur ist offen - Drawer muss gesamte sichtbare Höhe einnehmen
        drawerRef.current.style.height = `${viewport.height}px`;
        drawerRef.current.style.maxHeight = `${viewport.height}px`;

        // Input-Container: Safe Area auf 0 wenn Tastatur offen (Tastatur überdeckt Safe Area)
        if (inputContainerRef.current) {
          inputContainerRef.current.style.paddingBottom = `0.375rem`;
        }
      } else {
        // Tastatur ist geschlossen - normale Höhe (75dvh) und Safe Area berücksichtigen
        drawerRef.current.style.height = `75dvh`;
        drawerRef.current.style.maxHeight = `75dvh`;

        if (inputContainerRef.current) {
          inputContainerRef.current.style.paddingBottom = `calc(0.375rem + env(safe-area-inset-bottom, 0px))`;
        }
      }
    };

    // Initial position
    updateDrawerAndInput();

    // Listener für Viewport-Änderungen
    window.visualViewport.addEventListener("resize", updateDrawerAndInput);
    window.visualViewport.addEventListener("scroll", updateDrawerAndInput);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateDrawerAndInput);
      window.visualViewport?.removeEventListener("scroll", updateDrawerAndInput);
    };
  }, [isOpen]); // isInputFocused entfernt, da wir nur auf echte Tastatur-Höhe reagieren wollen

  // Prevent body scroll when drawer is open (Body Scroll Lock) - nur auf mobilen Geräten
  useEffect(() => {
    if (isOpen) {
      // Mobile Detection: Touch-Support und Viewport-Breite < 768px
      const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;

      if (isMobile) {
        // Speichere Original-Werte
        const originalBodyOverflow = document.body.style.overflow;
        const originalBodyOverscrollBehavior = document.body.style.overscrollBehavior;
        const originalBodyPosition = document.body.style.position;
        const originalBodyWidth = document.body.style.width;
        const originalBodyTop = document.body.style.top;

        const originalHtmlOverflow = document.documentElement.style.overflow;
        const originalHtmlOverscrollBehavior = document.documentElement.style.overscrollBehavior;

        // Verhindere komplettes Scrollen des Body und HTML
        const scrollY = window.scrollY;

        // Body sperren
        document.body.style.overflow = "hidden";
        document.body.style.overscrollBehavior = "none";
        document.body.style.position = "fixed";
        document.body.style.width = "100%";
        document.body.style.top = `-${scrollY}px`;

        // HTML sperren (wichtig für mobile Browser)
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.overscrollBehavior = "none";

        // Verhindere Touch-Scroll auf Body (zusätzliche Sicherheit)
        const preventScroll = (e: TouchEvent) => {
          // Nur verhindern, wenn nicht im Drawer
          if (!drawerRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        };

        // Verhindere Wheel-Scroll auf Body (zusätzliche Sicherheit)
        const preventWheel = (e: WheelEvent) => {
          // Nur verhindern, wenn nicht im Drawer
          if (!drawerRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        };

        // Nur auf Body anwenden, nicht im Drawer
        document.body.addEventListener("touchmove", preventScroll, { passive: false });
        document.body.addEventListener("wheel", preventWheel, { passive: false });

        return () => {
          // Entferne Event-Listener
          document.body.removeEventListener("touchmove", preventScroll);
          document.body.removeEventListener("wheel", preventWheel);

          // Stelle Original-Werte wieder her
          document.body.style.overflow = originalBodyOverflow;
          document.body.style.overscrollBehavior = originalBodyOverscrollBehavior;
          document.body.style.position = originalBodyPosition;
          document.body.style.width = originalBodyWidth;
          document.body.style.top = originalBodyTop;

          document.documentElement.style.overflow = originalHtmlOverflow;
          document.documentElement.style.overscrollBehavior = originalHtmlOverscrollBehavior;

          // Stelle Scroll-Position wieder her
          if (originalBodyPosition === "" || originalBodyPosition === "static") {
            window.scrollTo(0, scrollY);
          }
        };
      }

      // Desktop: Nur einfache Overflow-Hidden (ohne position: fixed)
      // Keine Event-Listener oder HTML-Overflow, da Desktop-Browser das nicht brauchen
      if (!isMobile) {
        const originalBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
          document.body.style.overflow = originalBodyOverflow;
        };
      }
    } else {
      setCommentText("");
      setReplyingTo(null);
      setIsInputFocused(false);
      setSortMode("neueste"); // Reset filter to default when drawer closes
      setIsFilterOpen(false); // Close filter dropdown when drawer closes
      // Clear time ago cache when drawer closes, so it recalculates on next open
      timeAgoCacheRef.current.clear();
    }
  }, [isOpen]);

  // Close drawer on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        onClose();
      }
      // Close filter dropdown if clicking outside
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node) &&
        isFilterOpen
      ) {
        setIsFilterOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, isFilterOpen]);

  // Reset processed highlight if the ID changes
  useEffect(() => {
    if (highlightCommentId !== processedHighlightRef.current) {
      processedHighlightRef.current = null;
    }
  }, [highlightCommentId]);

  // Scroll to and highlight specific comment when provided
  useEffect(() => {
    // Warte bis Drawer offen ist, highlightCommentId vorhanden ist, und Kommentare geladen sind
    if (!isOpen || !highlightCommentId || !allComments || allComments.length === 0) {
      return;
    }

    // Don't re-highlight if we already did it for this ID
    if (processedHighlightRef.current === highlightCommentId) {
      return;
    }

    // Finde den zu highlightenden Kommentar
    const targetComment = allComments.find(c => c._id === highlightCommentId);
    
    // Wenn Kommentar nicht gefunden, warte auf nächsten Render
    if (!targetComment) {
      console.log('Kommentar noch nicht geladen:', highlightCommentId);
      return;
    }

    console.log('Highlighte Kommentar:', highlightCommentId, targetComment);

    // 1. Auto-expand parents if it's a reply
    const parentIds = new Set<string>();
    let currentId: string | null = highlightCommentId;

    // Find the comment and its parents
    while (currentId) {
      const comment = allComments.find(c => c._id === currentId);
      if (comment?.parentCommentId) {
        const parentId = comment.parentCommentId as string;
        parentIds.add(parentId);
        currentId = parentId;
      } else {
        currentId = null;
      }
    }

    // Expand all parent comments sofort (nicht mit setState delay)
    if (parentIds.size > 0) {
      setExpandedReplies(prev => {
        const next = new Set(prev);
        parentIds.forEach(id => next.add(id));
        return next;
      });
    }

    // 2. Wait for rendering then scroll and highlight
    // Längere Verzögerung um sicherzustellen dass alles gerendert ist
    const timer = setTimeout(() => {
      const commentElement = document.querySelector(`[data-comment-id="${highlightCommentId}"]`);
      
      if (commentElement && commentsContainerRef.current) {
        console.log('Scrolle zu Kommentar Element');
        
        // Scroll to comment mit mehr Padding
        commentElement.scrollIntoView({ 
          behavior: "smooth", 
          block: "center",
          inline: "nearest"
        });

        // Highlight comment
        setHighlightedCommentId(highlightCommentId);
        processedHighlightRef.current = highlightCommentId;

        // Remove highlight after 3 seconds (etwas länger)
        setTimeout(() => {
          setHighlightedCommentId(null);
        }, 3000);
      } else {
        console.log('Kommentar Element nicht im DOM gefunden');
        // Retry nach weiteren 500ms wenn Element noch nicht gerendert
        setTimeout(() => {
          const retryElement = document.querySelector(`[data-comment-id="${highlightCommentId}"]`);
          if (retryElement) {
            retryElement.scrollIntoView({ 
              behavior: "smooth", 
              block: "center",
              inline: "nearest"
            });
            setHighlightedCommentId(highlightCommentId);
            processedHighlightRef.current = highlightCommentId;
            setTimeout(() => setHighlightedCommentId(null), 3000);
          }
        }, 500);
      }
    }, 600); // Längere Verzögerung für Thread expansion

    return () => clearTimeout(timer);
  }, [isOpen, highlightCommentId, allComments]);

  // Organize comments into threads and cache time ago strings
  const organizeComments = (comments: Comment[] | undefined, sortMode: "top" | "neueste") => {
    // If commentsCount is 0, we know there are no comments, so return empty
    if (commentsCount === 0) return { topLevel: [], replies: new Map() };
    if (!comments) return { topLevel: [], replies: new Map() };

    const topLevel: Comment[] = [];
    const replies = new Map<string, Comment[]>();

    comments.forEach((comment) => {
      // Cache time ago string for this comment - only calculate once
      const commentIdStr = comment._id as string;
      if (!timeAgoCacheRef.current.has(commentIdStr)) {
        timeAgoCacheRef.current.set(commentIdStr, formatTimeAgo(comment.createdAt));
      }

      if (comment.parentCommentId) {
        const parentId = comment.parentCommentId as string;
        if (!replies.has(parentId)) {
          replies.set(parentId, []);
        }
        replies.get(parentId)!.push(comment);
      } else {
        topLevel.push(comment);
      }
    });

    // Sort top-level comments based on sort mode
    if (sortMode === "top") {
      // Sort by likesCount descending, then by createdAt descending as tiebreaker
      topLevel.sort((a, b) => {
        if (b.likesCount !== a.likesCount) {
          return b.likesCount - a.likesCount;
        }
        return b.createdAt - a.createdAt;
      });
    } else {
      // Sort by createdAt descending (neueste)
      topLevel.sort((a, b) => b.createdAt - a.createdAt);
    }

    // Sort replies by createdAt (always newest first)
    replies.forEach((replyList) => {
      replyList.sort((a, b) => b.createdAt - a.createdAt);
    });

    return { topLevel, replies };
  };

  // Only organize comments if they exist
  // Use cached comments if allComments is undefined but we have cached comments
  // This ensures immediate display of cached comments without waiting for query
  const commentsToOrganize = allComments !== undefined
    ? allComments
    : (hasCachedComments && cachedComments ? cachedComments : undefined);

  const { topLevel, replies } = useMemo(() => {
    if (commentsToOrganize !== undefined) {
      return organizeComments(commentsToOrganize, sortMode);
    }
    return { topLevel: [], replies: new Map() };
  }, [commentsToOrganize, sortMode]);

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Synchroner Check mit useRef, um doppelte Submits zu verhindern
    if (isSubmittingRef.current) return;
    if (!currentUserId || !commentText.trim()) return;

    // Setze beide States sofort
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const textToSubmit = commentText.trim();
    const replyToId = replyingTo;

    try {
      await createComment({
        userId: currentUserId,
        postId,
        parentCommentId: replyToId || undefined,
        content: textToSubmit || "",
      });

      // If this was a reply, automatically expand all parent comments in the hierarchy
      // This ensures nested replies are visible immediately
      if (replyToId) {
        setExpandedReplies((prev) => {
          const next = new Set(prev);
          const replyToIdStr = replyToId as string;

          // Add the direct parent comment
          next.add(replyToIdStr);

          // Find all parent comments in the hierarchy and expand them
          // This ensures nested replies (replies to replies) are visible
          const findAndExpandParents = (commentId: string) => {
            const comment = commentsToOrganize?.find(c => c._id === commentId);
            if (comment && comment.parentCommentId) {
              const parentId = comment.parentCommentId as string;
              next.add(parentId);
              // Recursively find parent of parent
              findAndExpandParents(parentId);
            }
          };

          findAndExpandParents(replyToIdStr);

          return next;
        });
      }

      // Clear form but keep drawer open
      setCommentText("");
      setReplyingTo(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      // Tastatur offen lassen - kein blur(), damit User direkt weiter schreiben kann
      // Focus bleibt automatisch erhalten, da wir kein blur() aufrufen
    } catch (error) {
      console.error("Fehler beim Erstellen des Kommentars:", error);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleLike = async (commentId: Id<"comments">) => {
    if (!currentUserId) return;

    const commentIdStr = commentId as string;
    const comment = allComments?.find((c) => c._id === commentId);
    if (!comment) return;

    const wasLiked = optimisticLikes.has(commentIdStr)
      ? optimisticLikes.get(commentIdStr)!
      : comment.isLiked;

    // Optimistic update
    setOptimisticLikes((prev) => {
      const next = new Map(prev);
      next.set(commentIdStr, !wasLiked);
      return next;
    });

    try {
      await likeComment({ userId: currentUserId, commentId });
    } catch (error) {
      // Revert on error
      setOptimisticLikes((prev) => {
        const next = new Map(prev);
        next.set(commentIdStr, wasLiked);
        return next;
      });
      console.error("Fehler beim Liken des Kommentars:", error);
    }
  };

  const handleDislike = async (commentId: Id<"comments">) => {
    if (!currentUserId) return;

    const commentIdStr = commentId as string;
    const comment = allComments?.find((c) => c._id === commentId);
    if (!comment) return;

    const wasDisliked = optimisticDislikes.has(commentIdStr)
      ? optimisticDislikes.get(commentIdStr)!
      : (comment.isDisliked ?? false);

    // Optimistic update
    setOptimisticDislikes((prev) => {
      const next = new Map(prev);
      next.set(commentIdStr, !wasDisliked);
      return next;
    });

    // Also remove like if it exists
    if (!wasDisliked) {
      const wasLiked = optimisticLikes.has(commentIdStr)
        ? optimisticLikes.get(commentIdStr)!
        : comment.isLiked;

      if (wasLiked) {
        setOptimisticLikes((prev) => {
          const next = new Map(prev);
          next.set(commentIdStr, false);
          return next;
        });
      }
    }

    try {
      await dislikeComment({ userId: currentUserId, commentId });
    } catch (error) {
      // Revert on error
      setOptimisticDislikes((prev) => {
        const next = new Map(prev);
        next.set(commentIdStr, wasDisliked);
        return next;
      });
      console.error("Fehler beim Disliken des Kommentars:", error);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const getRepliesForComment = (commentId: Id<"comments">): Comment[] => {
    return replies.get(commentId as string) || [];
  };

  const CommentItem = ({ comment }: { comment: Comment }) => {
    const commentReplies = getRepliesForComment(comment._id);
    const isExpanded = expandedReplies.has(comment._id as string);
    const hasReplies = commentReplies.length > 0;
    const commentIdStr = comment._id as string;
    const displayIsLiked = optimisticLikes.has(commentIdStr)
      ? optimisticLikes.get(commentIdStr)!
      : comment.isLiked;
    const displayIsDisliked = optimisticDislikes.has(commentIdStr)
      ? optimisticDislikes.get(commentIdStr)!
      : (comment.isDisliked ?? false);

    // Get cached time ago string - already calculated in organizeComments
    // If not in cache, calculate it now (fallback)
    let timeAgo = timeAgoCacheRef.current.get(commentIdStr);
    if (!timeAgo) {
      timeAgo = formatTimeAgo(comment.createdAt);
      timeAgoCacheRef.current.set(commentIdStr, timeAgo);
    }

    // Ein Kommentar ist eine Antwort, wenn er ein parentCommentId hat
    // Aber alle Antworten sollen die gleiche Position haben, unabhängig von der Verschachtelungstiefe
    const isReply = !!comment.parentCommentId;
    const isHighlighted = highlightedCommentId === commentIdStr;

    return (
      <div
        data-comment-id={commentIdStr}
        className={`py-2.5 border-b border-gray-100 last:border-b-0 overflow-x-hidden ${isReply ? "" : "px-4"} transition-all duration-1000 ease-out`}
        style={{
          ...(isReply ? { marginLeft: 0, marginRight: 0, paddingLeft: 0, paddingRight: 0 } : {}),
          ...(isHighlighted ? { backgroundColor: "rgba(251, 191, 36, 0.2)" } : {})
        }}
      >
        <div
          className="flex gap-2.5 overflow-x-hidden"
          style={isReply ? { marginLeft: 0, marginRight: 0, paddingLeft: 0, paddingRight: 0 } : {}}
        >
          {/* Avatar */}
          <Avatar className="w-9 h-9 rounded-full flex-shrink-0" style={{ flexShrink: 0 }}>
            <AvatarImage src={comment.user.image} alt={comment.user.name} />
            <AvatarFallback className="text-xs font-semibold rounded-full bg-gray-200 text-gray-700">
              {comment.user.name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0" style={{ minWidth: 0 }}>
            <div className="flex items-start gap-2 mb-1">
              <div className="flex-1 min-w-0" style={{ minWidth: 0, flexShrink: 1 }}>
                <span className="font-semibold text-sm text-gray-900 mr-1.5">
                  {comment.user.name}
                </span>
                <span className="text-xs text-gray-500">
                  {timeAgo}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0" style={{ marginRight: '-20px' }}>
                {/* Like Button - fixed width to prevent shifting */}
                <button
                  onClick={() => handleLike(comment._id)}
                  className="flex flex-row items-center gap-1 flex-shrink-0 px-1.5 py-0.5 touch-manipulation active:scale-95 transition-transform"
                  style={{ flexShrink: 0, width: 'auto', minWidth: 'fit-content' }}
                  disabled={!currentUserId}
                >
                  <Heart
                    className={`transition-all duration-200 ${displayIsLiked
                      ? "text-red-500 fill-red-500 scale-110"
                      : "text-gray-400"
                      }`}
                    style={{
                      height: "18px",
                      width: "18px",
                      minHeight: "18px",
                      minWidth: "18px",
                      flexShrink: 0,
                      fill: displayIsLiked ? "currentColor" : "none",
                      stroke: "currentColor",
                      strokeWidth: 2,
                    }}
                  />
                  <span className={`text-xs tabular-nums transition-colors ${displayIsLiked ? "text-red-500" : "text-gray-500"
                    }`} style={{ flexShrink: 0, minWidth: '1.5ch', display: 'inline-block' }}>
                    {comment.likesCount > 0 ? comment.likesCount : <span className="invisible">0</span>}
                  </span>
                </button>

                {/* Dislike Button */}
                <button
                  onClick={() => handleDislike(comment._id)}
                  className="flex flex-row items-center gap-1 flex-shrink-0 px-1.5 py-0.5 touch-manipulation active:scale-95 transition-transform"
                  style={{ flexShrink: 0, width: 'auto', minWidth: 'fit-content' }}
                  disabled={!currentUserId}
                >
                  <ThumbsDown
                    className={`transition-all duration-200 ${displayIsDisliked
                      ? "text-gray-600 fill-gray-600 scale-110"
                      : "text-gray-400"
                      }`}
                    style={{
                      height: "18px",
                      width: "18px",
                      minHeight: "18px",
                      minWidth: "18px",
                      flexShrink: 0,
                      fill: displayIsDisliked ? "currentColor" : "none",
                      stroke: "currentColor",
                      strokeWidth: 2,
                    }}
                  />
                  <span className="text-xs tabular-nums transition-colors text-gray-500" style={{ flexShrink: 0, minWidth: '1.5ch', display: 'inline-block', visibility: 'hidden' }}>
                    0
                  </span>
                </button>
              </div>
            </div>

            {/* Show message if disliked, otherwise show comment content */}
            {displayIsDisliked ? (
              <p className="text-sm text-gray-500 italic mb-1.5 leading-relaxed">
                Dieser Kommentar wird dir nicht mehr angezeigt
              </p>
            ) : (
              <>
                {/* Comment Text */}
                {comment.content && (
                  <p className="text-sm text-gray-900 whitespace-pre-wrap break-words mb-1.5 leading-relaxed">
                    {renderContentWithMentions(comment.content)}
                  </p>
                )}

                {/* Comment Image */}
                {comment.imageUrl && (
                  <div className="mb-1.5">
                    <img
                      src={comment.imageUrl}
                      alt="Kommentar Bild"
                      className="max-w-full max-h-64 rounded-lg object-cover"
                    />
                  </div>
                )}

                {/* Reply Button */}
                {currentUserId && (
                  <button
                    onClick={() => {
                      setReplyingTo(comment._id);
                      textareaRef.current?.focus();
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium mb-1 touch-manipulation"
                  >
                    Antworten
                  </button>
                )}
              </>
            )}

            {/* Replies Section - only show if not disliked */}
            {!displayIsDisliked && hasReplies && (
              <div className="mt-1.5">
                <button
                  onClick={() => toggleReplies(comment._id as string)}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium mb-1.5 touch-manipulation flex items-center gap-1"
                >
                  {isExpanded ? (
                    "Antworten ausblenden"
                  ) : (
                    <>
                      {comment.repliesCount} {comment.repliesCount === 1 ? "Antwort" : "Antworten"} anzeigen
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>

                {isExpanded && (
                  <div>
                    {commentReplies.map((reply) => (
                      <CommentItem key={reply._id} comment={reply} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[60] flex flex-col transition-transform duration-300 ease-out ${isOpen ? "translate-y-0" : "translate-y-full"
          } h-[75dvh] overflow-hidden`}
        style={{
          pointerEvents: isOpen ? "auto" : "none",
          overscrollBehavior: 'none', // Verhindert Hüpfen auf iOS
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {commentsCount} {commentsCount === 1 ? "Kommentar" : "Kommentare"}
          </h2>
          <div className="flex items-center gap-2 relative">
            {/* Filter Icon */}
            {commentsCount > 0 && (
              <div ref={filterRef} className="relative">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="p-1.5 touch-manipulation relative"
                  style={{ left: '8px' }}
                >
                  <SlidersHorizontal className={`text-gray-600 transition-colors ${isFilterOpen ? "text-[#D08945]" : ""
                    }`} style={{ height: "18px", width: "18px", minHeight: "18px", minWidth: "18px" }} />
                </button>
                {/* Dropdown Menu */}
                {isFilterOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[140px]">
                    <button
                      onClick={() => {
                        setSortMode("top");
                        setIsFilterOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 touch-manipulation flex items-center justify-between"
                    >
                      <span>Top</span>
                      {sortMode === "top" && (
                        <Check className="w-4 h-4 text-[#D08945]" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setSortMode("neueste");
                        setIsFilterOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 touch-manipulation flex items-center justify-between"
                    >
                      <span>Neueste</span>
                      {sortMode === "neueste" && (
                        <Check className="w-4 h-4 text-[#D08945]" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 touch-manipulation relative"
              aria-label="Schließen"
              style={{ left: '6px' }}
            >
              <X className="text-gray-600" style={{ height: "18px", width: "18px", minHeight: "18px", minWidth: "18px" }} />
            </button>
          </div>
        </div>

        {/* Comments List */}
        <div
          ref={commentsContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden py-1"
          style={{
            overscrollBehavior: 'none', // Verhindert Rubber-Banding
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : (commentsToOrganize === undefined && commentsCount === 0) || (commentsToOrganize && commentsToOrganize.length === 0) ? (
            <div className="text-center text-gray-500 py-8 text-sm px-4">
              Noch keine Kommentare
            </div>
          ) : topLevel.length > 0 ? (
            <div className="space-y-0">
              {topLevel.map((comment) => (
                <CommentItem key={comment._id} comment={comment} />
              ))}
            </div>
          ) : null}
        </div>

        {/* Sticky Input */}
        {currentUserId && (
          <div
            ref={inputContainerRef}
            className="bg-white px-4 pt-2 pb-1.5 flex-shrink-0 border-t border-gray-200"
            style={{
              paddingBottom: `calc(0.375rem + ${isInputFocused ? '0px' : 'env(safe-area-inset-bottom, 0px)'})`,
            }}
          >
            {replyingTo && (
              <div className="flex items-center justify-between mb-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-600">
                  Antwort an{" "}
                  <span className="font-semibold">
                    {allComments?.find((c) => c._id === replyingTo)?.user.name}
                  </span>
                </span>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setCommentText("");
                  }}
                  className="text-gray-400 hover:text-gray-600 touch-manipulation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-2.5 items-center">
              <Avatar className="w-8 h-8 rounded-full flex-shrink-0">
                <AvatarImage
                  src={currentUser?.image}
                  alt={currentUser?.name || "Du"}
                />
                <AvatarFallback className="text-xs font-semibold rounded-full bg-gray-200 text-gray-700">
                  {currentUser?.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2 items-center">
                <textarea
                  ref={textareaRef}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onFocus={(e) => {
                    setIsInputFocused(true);
                    // Nur auf mobilen Geräten scrollIntoView verwenden (für Keyboard-Handling)
                    // Auf Desktop würde das ungewolltes Scrollen verursachen
                    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
                    if (isMobile && inputContainerRef.current) {
                      inputContainerRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    }
                  }}
                  onBlur={() => setIsInputFocused(false)}
                  placeholder={replyingTo ? "Antwort schreiben..." : "Kommentar hinzufügen ..."}
                  className="flex-1 px-3 py-2 text-base rounded-full border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent resize-none overflow-y-auto scrollbar-hide"
                  rows={1}
                  {...({ virtualkeyboardpolicy: "manual" } as any)}
                  style={{
                    maxHeight: "100px",
                    minHeight: "36px",
                    fontSize: "16px", // Verhindert automatisches Zoomen auf iOS (wichtig für PWA!)
                    lineHeight: "1.5",
                  }}
                  disabled={isSubmitting}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      // Let the form onSubmit handle it - don't prevent default
                      // This allows the form to submit naturally, preventing double submission
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !commentText.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#D08945] rounded-full hover:bg-[#B8753A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 touch-manipulation"
                >
                  {isSubmitting ? "..." : "Posten"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

    </>
  );
}

