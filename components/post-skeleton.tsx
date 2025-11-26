export function PostSkeleton() {
  return (
    <div className="border-b border-slate-200 p-4">
      <div className="flex gap-3">
        <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-12 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="flex gap-6 pt-2">
            <div className="h-4 w-12 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-12 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-12 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}








