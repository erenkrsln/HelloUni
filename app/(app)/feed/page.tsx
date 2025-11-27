import { Suspense } from "react";
import { FeedClient } from "./feed-client";
import { FeedSkeleton } from "./feed-skeleton";

export default function FeedPage() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedClient />
    </Suspense>
  );
}

