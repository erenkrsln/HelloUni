export function ProfileSkeleton() {
  return (
    <>
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center gap-8">
          <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </div>
      <div className="h-48 bg-slate-200" />
      <div className="px-4">
        <div className="-mt-16 flex h-32 w-32 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-4 space-y-3">
          <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    </>
  );
}




