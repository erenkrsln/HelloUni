"use client";

import { PostsCacheProvider } from "@/lib/contexts/posts-context";

export function PostsCacheWrapper({ children }: { children: React.ReactNode }) {
  return <PostsCacheProvider>{children}</PostsCacheProvider>;
}




