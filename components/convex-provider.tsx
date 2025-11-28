"use client";

import { ConvexProvider, ConvexReactClient, useQuery } from "convex/react";
import { ReactNode } from "react";
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL environment variable");
}

const convex = new ConvexReactClient(convexUrl);

function DataPreloader({ children }: { children: ReactNode }) {
  // Preload current user to cache it across all pages
  const user = useQuery(api.queries.getCurrentUser);

  // Preload user posts if user exists
  useQuery(api.queries.getUserPosts, user ? { userId: user._id } : "skip");

  // Preload feed for home page
  useQuery(api.queries.getFeed);

  return <>{children}</>;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <DataPreloader>{children}</DataPreloader>
    </ConvexProvider>
  );
}

