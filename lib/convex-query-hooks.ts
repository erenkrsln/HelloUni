"use client";

import { useQueryClient } from "@tanstack/react-query";
import { convexClient } from "@/lib/convex-client";
import { api } from "@/convex/_generated/api";

export function usePrefetchConvexQuery() {
  const queryClient = useQueryClient();

  return {
    prefetchUser: async (username: string) => {
      const queryKey = ["convex", "users.getUserByUsername", { username }];
      const cachedData = queryClient.getQueryData(queryKey);
      if (cachedData) return cachedData as any;
      
      await queryClient.prefetchQuery({
        queryKey,
        queryFn: async () => {
          return await convexClient.query(api.users.getUserByUsername, {
            username,
          });
        },
        staleTime: 1000 * 60 * 5,
      });
      return queryClient.getQueryData(queryKey) as any;
    },
    prefetchUserPosts: async (userId: string) => {
      const queryKey = ["convex", "posts.getUserPosts", { userId }];
      if (queryClient.getQueryData(queryKey)) return;
      
      await queryClient.prefetchQuery({
        queryKey,
        queryFn: async () => {
          return await convexClient.query(api.posts.getUserPosts, {
            userId: userId as any,
          });
        },
        staleTime: 1000 * 60 * 5,
      });
    },
    prefetchPosts: async (limit = 50) => {
      const queryKey = ["convex", "posts.getPosts", { limit }];
      if (queryClient.getQueryData(queryKey)) return;
      
      await queryClient.prefetchQuery({
        queryKey,
        queryFn: async () => {
          return await convexClient.query(api.posts.getPosts, { limit });
        },
        staleTime: 1000 * 60 * 5,
      });
    },
  };
}

export function useInvalidateConvexQueries() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["convex"] });
  };
}

