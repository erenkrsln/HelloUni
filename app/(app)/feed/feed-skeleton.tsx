import { PostSkeleton } from "@/components/post-skeleton";

export function FeedSkeleton() {
  return (
    <>
      <div className="border-b border-slate-200 p-4">
        <div className="flex gap-3">
          <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-20 w-full animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <PostSkeleton key={i} />
      ))}
    </>
  );
}






