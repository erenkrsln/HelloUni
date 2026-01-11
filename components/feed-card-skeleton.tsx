"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface FeedCardSkeletonProps {
  showDivider?: boolean;
}

export function FeedCardSkeleton({ showDivider = true }: FeedCardSkeletonProps) {
  return (
    <article
      className="relative px-4 py-3"
      style={{
        marginBottom: "0",
        borderBottom: showDivider ? "1px solid rgba(0, 0, 0, 0.1)" : "none"
      }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar Skeleton */}
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          {/* Name, Username, Time Skeleton */}
          <div className="flex items-center gap-1 mb-1 min-w-0 -mt-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20 ml-1" />
            <Skeleton className="h-3 w-3 rounded-full mx-1" />
            <Skeleton className="h-4 w-16" />
            <div className="ml-auto mr-2 w-8 h-8 flex-shrink-0" />
          </div>

          {/* Major & Semester Skeleton (optional, wird zufällig angezeigt) */}
          <div className="text-[13px] -mt-2 mb-3">
            <Skeleton className="h-3 w-32" />
          </div>

          {/* Title Skeleton (optional) */}
          <div className="mb-2">
            <Skeleton className="h-5 w-3/4" />
          </div>

          {/* Content Skeleton - 2-3 Zeilen */}
          <div className="mb-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </div>

          {/* Image Skeleton (optional, wird zufällig angezeigt) */}
          <div className="mb-3">
            <Skeleton className="w-full rounded-lg" style={{ aspectRatio: "16/9", height: "auto" }} />
          </div>

          {/* Action Buttons Skeleton */}
          <div className="flex items-center gap-6 mt-2">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      </div>
    </article>
  );
}

