"use client";

import { Heart, MessageCircle, Bookmark } from "lucide-react";

interface PostActionsProps {
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  onLike: () => void;
  isLiking: boolean;
  currentUserId?: string;
}

export function PostActions({ 
  likesCount, 
  commentsCount, 
  isLiked, 
  onLike, 
  isLiking,
  currentUserId 
}: PostActionsProps) {
  return (
    <div className="flex items-center justify-between mt-3 max-w-[80%]">
      <button
        onClick={onLike}
        disabled={!currentUserId || isLiking}
        className="flex items-center gap-1 h-10 px-0 font-normal disabled:opacity-50 flex-shrink-0 group rounded-full transition-colors outline-none focus:outline-none active:outline-none touch-manipulation"
        onTouchEnd={(e) => {
          e.currentTarget.blur();
        }}
      >
        <Heart 
          style={{ height: "18px", width: "18px", fill: isLiked ? "currentColor" : "none" }} 
          className={isLiked ? "text-red-500" : "text-gray-500 group-hover:text-red-500"} 
        />
        <span className={`text-[13px] tabular-nums inline-block min-w-[1.5ch] ${isLiked ? "text-red-500" : "text-gray-500 group-hover:text-red-500"}`}>
          {likesCount > 0 ? likesCount : <span className="invisible">0</span>}
        </span>
      </button>
      <button className="flex items-center gap-1 h-10 px-0 font-normal cursor-pointer flex-shrink-0 group rounded-full transition-colors">
        <MessageCircle className="text-gray-500 group-hover:text-blue-500" style={{ height: "18px", width: "18px", minHeight: "18px", minWidth: "18px" }} />
        <span className="text-[13px] tabular-nums inline-block min-w-[1.5ch] text-gray-500 group-hover:text-blue-500">
          {commentsCount > 0 ? commentsCount : <span className="invisible">0</span>}
        </span>
      </button>
      <button className="flex items-center gap-1 h-10 px-0 font-normal cursor-pointer flex-shrink-0 group rounded-full transition-colors">
        <Bookmark className="text-gray-500 group-hover:text-blue-500" style={{ height: "18px", width: "18px", minHeight: "18px", minWidth: "18px" }} />
        <span className="text-[13px] tabular-nums inline-block min-w-[1.5ch] invisible">
          0
        </span>
      </button>
    </div>
  );
}




