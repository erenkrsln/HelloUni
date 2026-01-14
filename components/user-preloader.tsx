"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export function UserPreloader() {
    // These queries run in the background to keep data cached
    useQuery(api.queries.getCurrentUser);
    const { currentUserId } = useCurrentUser();
    useQuery(
      api.queries.getFeed,
      currentUserId ? { userId: currentUserId } : {}
    );
    return null;
}
