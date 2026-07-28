"use client";

import { Heart, MessageCircle, Send } from "lucide-react";

interface PostActionsProps {
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  onLike: () => void;
  isLiking: boolean;
  currentUserId?: string;
  onCommentClick?: () => void;
  onShareClick?: () => void;
}

export function PostActions({
  likesCount,
  commentsCount,
  isLiked,
  onLike,
  isLiking,
  currentUserId,
  onCommentClick,
  onShareClick
}: PostActionsProps) {
  return (
    <div className="flex items-center justify-between w-full mt-3">
      <button
        onClick={onLike}
        disabled={!currentUserId || isLiking}
        aria-label={`${isLiked ? "Gefällt mir nicht mehr" : "Gefällt mir"} (${likesCount} Likes)`}
        aria-pressed={isLiked}
        className="flex items-center gap-1 h-10 px-0 font-normal disabled:opacity-50 flex-shrink-0 group rounded-full transition-colors outline-none focus:outline-none active:outline-none touch-manipulation"
        onTouchEnd={(e) => {
          e.currentTarget.blur();
        }}
      >
        <Heart
          aria-hidden="true"
          key={`heart-${isLiked ? 'liked' : 'unliked'}-${likesCount}`}
          style={{
            height: "18px",
            width: "18px",
            minHeight: "18px",
            minWidth: "18px",
            fill: isLiked ? "currentColor" : "none",
            stroke: "currentColor",
            strokeWidth: 2,
            color: isLiked ? "#ef4444" : "#6b7280"
          }}
          className={isLiked ? "text-red-500" : "text-muted-foreground group-hover:text-red-500"}
        />
        <span className={`text-[13px] tabular-nums inline-block min-w-[1.5ch] ${isLiked ? "text-red-500" : "text-muted-foreground"}`}>
          {likesCount > 0 ? likesCount : <span className="invisible">0</span>}
        </span>
      </button>
      <button
        onClick={onCommentClick}
        aria-label={`Kommentieren (${commentsCount} Kommentare)`}
        className="flex items-center gap-1 h-10 px-0 font-normal cursor-pointer flex-shrink-0 group rounded-full transition-colors outline-none focus:outline-none active:outline-none touch-manipulation"
        onTouchEnd={(e) => {
          e.currentTarget.blur();
        }}
      >
        <MessageCircle aria-hidden="true" className="text-muted-foreground group-hover:text-blue-500" style={{ height: "18px", width: "18px", minHeight: "18px", minWidth: "18px" }} />
        <span className="text-[13px] tabular-nums inline-block min-w-[1.5ch] text-muted-foreground group-hover:text-blue-500">
          {commentsCount > 0 ? commentsCount : <span className="invisible">0</span>}
        </span>
      </button>
      <button
        onClick={onShareClick}
        aria-label="Teilen"
        className="flex items-center gap-1 h-10 px-0 font-normal cursor-pointer flex-shrink-0 group rounded-full transition-colors"
      >
        <Send aria-hidden="true" className="text-muted-foreground group-hover:text-green-500" style={{ height: "18px", width: "18px", minHeight: "18px", minWidth: "18px" }} />
        <span className="text-[13px] tabular-nums inline-block min-w-[1.5ch] invisible">
          0
        </span>
      </button>
    </div>
  );
}












