"use client";

/**
 * FeedSkeleton - Platzhalter für FeedCards während des Ladens
 * Simuliert die exakte Struktur der FeedCard für Layout-Stabilität
 */
export function FeedSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((index) => (
        <article
          key={index}
          className="relative px-4 py-3"
          style={{
            marginBottom: "0",
            borderBottom: index < 5 ? "1px solid rgba(0, 0, 0, 0.1)" : "none"
          }}
        >
          <div className="flex items-start gap-3">
            {/* Avatar Skeleton */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Header Skeleton: Name, Username, Time */}
              <div className="flex items-center gap-1 mb-1 min-w-0 -mt-1">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-16 bg-muted animate-pulse rounded ml-1" />
                <div className="h-4 w-12 bg-muted animate-pulse rounded ml-1" />
                <div className="ml-auto mr-2 w-8 h-8" />
              </div>

              {/* Major & Semester Skeleton */}
              <div className="h-3 w-32 bg-muted animate-pulse rounded mb-3" />

              {/* Post Type Badge Skeleton (optional) */}
              <div className="h-5 w-28 bg-muted animate-pulse rounded-full mb-2" />

              {/* Title Skeleton (optional) */}
              {index % 2 === 0 && (
                <div className="h-5 w-3/4 bg-muted animate-pulse rounded mb-2" />
              )}

              {/* Content Skeleton: 2-3 Zeilen */}
              <div className="space-y-2 mb-3">
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
                <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
                {index % 3 === 0 && (
                  <div className="h-4 w-4/6 bg-muted animate-pulse rounded" />
                )}
              </div>

              {/* Image Skeleton - mit fester Aspect-Ratio */}
              <div className="mt-3 w-full rounded-2xl overflow-hidden">
                <div 
                  className="w-full bg-muted animate-pulse rounded-2xl"
                  style={{
                    aspectRatio: '16 / 9',
                    maxHeight: '80vh',
                  }}
                />
              </div>

              {/* Actions Skeleton */}
              <div className="flex items-center gap-4 mt-3">
                <div className="h-5 w-12 bg-muted animate-pulse rounded" />
                <div className="h-5 w-12 bg-muted animate-pulse rounded" />
                <div className="h-5 w-12 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        </article>
      ))}
    </>
  );
}
