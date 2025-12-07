"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function UserPreloader() {
    // These queries run in the background to keep data cached
    useQuery(api.queries.getCurrentUser);
    // getFeed erwartet jetzt ein Argument (userId ist optional)
    useQuery(api.queries.getFeed, {});
    return null;
}
