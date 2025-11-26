"use client";

import { useQuery, useMutation } from "convex/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { HeartIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import { useInvalidateConvexQueries } from "@/lib/convex-query-hooks";

interface PostLikeButtonProps {
  postId: string;
  userId: string | undefined;
  likes: number;
  postsQueryKey: any;
  likedPostIds?: string[];
}

export function PostLikeButton({ postId, userId, likes, postsQueryKey, likedPostIds }: PostLikeButtonProps) {
  const queryClient = useQueryClient();
  const invalidateQueries = useInvalidateConvexQueries();

  const isPostLikedQueryKey = userId 
    ? ["convex", "posts.isPostLiked", { postId, userId }]
    : null;

  const cachedIsLiked = isPostLikedQueryKey
    ? (queryClient.getQueryData(isPostLikedQueryKey) as boolean | undefined)
    : undefined;

  const isLikedFromList = likedPostIds?.includes(postId);
  const isLikedQuery = useQuery(
    api.posts.isPostLiked,
    userId && !likedPostIds ? { postId: postId as any, userId: userId as any } : "skip"
  );

  useEffect(() => {
    if (isLikedQuery !== undefined && isPostLikedQueryKey) {
      queryClient.setQueryData(isPostLikedQueryKey, isLikedQuery);
    }
  }, [isLikedQuery, isPostLikedQueryKey, queryClient]);

  const isLiked = isLikedFromList ?? (isLikedQuery !== undefined ? isLikedQuery : cachedIsLiked) ?? false;

  const likePost = useMutation(api.posts.likePost);
  const unlikePost = useMutation(api.posts.unlikePost);

  const handleLike = async () => {
    if (!userId) return;

    const newIsLiked = !isLiked;
    const newLikes = isLiked ? likes - 1 : likes + 1;

    if (isPostLikedQueryKey) {
      queryClient.setQueryData(isPostLikedQueryKey, newIsLiked);
    }

    const likedPostIdsKey = userId ? ["convex", "posts.getLikedPostIds", { userId }] : null;
    if (likedPostIdsKey) {
      const cachedLikedPostIds = queryClient.getQueryData(likedPostIdsKey) as string[] | undefined;
      if (cachedLikedPostIds) {
        const updatedLikedPostIds = newIsLiked
          ? [...cachedLikedPostIds, postId]
          : cachedLikedPostIds.filter((id: string) => id !== postId);
        queryClient.setQueryData(likedPostIdsKey, updatedLikedPostIds);
      }
    }

    const updatePostInCache = (queryKey: any[]) => {
      const cachedData = queryClient.getQueryData(queryKey) as any[] | undefined;
      if (cachedData) {
        const updatedData = cachedData.map((post: any) => {
          if (post._id === postId) {
            return {
              ...post,
              likes: newLikes,
            };
          }
          return post;
        });
        queryClient.setQueryData(queryKey, updatedData);
      }
    };

    updatePostInCache(postsQueryKey);
    queryClient.invalidateQueries({ queryKey: ["convex", "posts.getUserPosts"] });
    const allUserPostsKeys = queryClient.getQueryCache().getAll().map(query => query.queryKey);
    allUserPostsKeys.forEach(key => {
      if (Array.isArray(key) && key[0] === "convex" && key[1] === "posts.getUserPosts") {
        updatePostInCache(key);
      }
    });

    try {
      if (isLiked) {
        await unlikePost({ postId: postId as any, userId: userId as any });
      } else {
        await likePost({ postId: postId as any, userId: userId as any });
      }
      
      queryClient.invalidateQueries({ queryKey: postsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["convex", "posts.getUserPosts"] });
      queryClient.invalidateQueries({ queryKey: ["convex", "posts.isPostLiked"] });
      queryClient.invalidateQueries({ queryKey: ["convex", "posts.getLikedPostIds"] });
      queryClient.refetchQueries({ queryKey: postsQueryKey });
      queryClient.refetchQueries({ queryKey: ["convex", "posts.getUserPosts"] });
      queryClient.refetchQueries({ queryKey: ["convex", "posts.getLikedPostIds"] });
      invalidateQueries();
    } catch (error) {
      if (isPostLikedQueryKey) {
        queryClient.setQueryData(isPostLikedQueryKey, isLiked);
      }
      if (likedPostIdsKey) {
        const cachedLikedPostIds = queryClient.getQueryData(likedPostIdsKey) as string[] | undefined;
        if (cachedLikedPostIds) {
          const revertedLikedPostIds = isLiked
            ? [...cachedLikedPostIds, postId]
            : cachedLikedPostIds.filter((id: string) => id !== postId);
          queryClient.setQueryData(likedPostIdsKey, revertedLikedPostIds);
        }
      }
      updatePostInCache(postsQueryKey);
      queryClient.invalidateQueries({ queryKey: ["convex", "posts.getUserPosts"] });
      allUserPostsKeys.forEach(key => {
        if (Array.isArray(key) && key[0] === "convex" && key[1] === "posts.getUserPosts") {
          updatePostInCache(key);
        }
      });
      console.error("Like/Unlike fehlgeschlagen:", error);
    }
  };

  return (
    <button
      onClick={handleLike}
      className={`group flex items-center gap-2 transition ${
        isLiked
          ? "text-red-500 hover:text-red-600"
          : "text-slate-500 hover:text-red-500"
      }`}
    >
      {isLiked ? (
        <HeartIconSolid className="h-5 w-5" />
      ) : (
        <HeartIcon className="h-5 w-5" />
      )}
      <span className="text-sm">
        {(() => {
          const cachedPosts = queryClient.getQueryData(postsQueryKey) as any[] | undefined;
          const cachedPost = cachedPosts?.find((p: any) => p._id === postId);
          if (cachedPost?.likes !== undefined) {
            return cachedPost.likes;
          }
          const allUserPostsKeys = queryClient.getQueryCache().getAll().map(query => query.queryKey);
          for (const key of allUserPostsKeys) {
            if (Array.isArray(key) && key[0] === "convex" && key[1] === "posts.getUserPosts") {
              const cachedUserPosts = queryClient.getQueryData(key) as any[] | undefined;
              const cachedUserPost = cachedUserPosts?.find((p: any) => p._id === postId);
              if (cachedUserPost?.likes !== undefined) {
                return cachedUserPost.likes;
              }
            }
          }
          return likes ?? 0;
        })()}
      </span>
    </button>
  );
}

