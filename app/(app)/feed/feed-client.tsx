"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import {
  ChatBubbleOvalLeftIcon,
  ArrowPathIcon,
  EllipsisHorizontalIcon,
  PhotoIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import { useUserData } from "../user-context";
import { useInvalidateConvexQueries, usePrefetchConvexQuery } from "@/lib/convex-query-hooks";
import { useToast } from "@/lib/toast-context";
import { DeletePostModal } from "@/components/delete-post-modal";
import { useAppInitialization } from "@/lib/app-initialization-context";
import { PostLikeButton } from "@/components/post-like-button";
import { formatRelativeTime } from "@/lib/format-time";
import { ImageModal } from "@/components/image-modal";
import { PostImage } from "@/components/post-image";
import { useScroll } from "@/lib/scroll-context";

export function FeedClient() {
  const [newPost, setNewPost] = useState("");
  const [feedTab, setFeedTab] = useState<"foryou" | "following">("foryou");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const deletedPostIdsRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();
  const user = session?.user;

  const initialUserData = useUserData();
  const queryClient = useQueryClient();
  const invalidateQueries = useInvalidateConvexQueries();
  const prefetch = usePrefetchConvexQuery();
  const { showToast } = useToast();
  const { isInitializing, setInitialized } = useAppInitialization();
  
  const currentUserQuery = useQuery(
    api.users.getUserByUsername,
    user?.username ? { username: user.username } : "skip"
  );
  
  const currentUser = currentUserQuery ?? initialUserData;
  
  const postsQueryKey = ["convex", "posts.getPosts", { limit: 50 }];
  const followingPostsQueryKey = currentUser?._id 
    ? ["convex", "posts.getFollowingPosts", { userId: currentUser._id, limit: 50 }]
    : null;
  
  const posts = useQuery(api.posts.getPosts, { limit: 50 });
  const followingPosts = useQuery(
    api.posts.getFollowingPosts,
    currentUser?._id ? { userId: currentUser._id as any, limit: 50 } : "skip"
  );
  const likedPostIds = useQuery(
    api.posts.getLikedPostIds,
    currentUser?._id ? { userId: currentUser._id as any } : "skip"
  );
  
  const [hasInitialized, setHasInitialized] = useState(false);
  const { isHeaderVisible } = useScroll();
  
  useEffect(() => {
    if (posts) {
      queryClient.setQueryData(postsQueryKey, posts);
      setHasInitialized(true);
      if (isInitializing) {
        setInitialized();
      }
    }
  }, [posts, queryClient, postsQueryKey, isInitializing, setInitialized]);

  useEffect(() => {
    if (followingPosts && followingPostsQueryKey) {
      queryClient.setQueryData(followingPostsQueryKey, followingPosts);
    }
  }, [followingPosts, queryClient, followingPostsQueryKey]);

  useEffect(() => {
    if (!hasInitialized && !posts) {
      queryClient.refetchQueries({ queryKey: postsQueryKey });
    }
  }, [hasInitialized, posts, queryClient, postsQueryKey]);
  
  const cachedPosts = queryClient.getQueryData(postsQueryKey) as typeof posts | undefined;
  const cachedFollowingPosts = followingPostsQueryKey 
    ? (queryClient.getQueryData(followingPostsQueryKey) as typeof followingPosts | undefined)
    : undefined;
  
  const displayPosts = feedTab === "following" 
    ? (followingPosts ?? cachedFollowingPosts)
    : (posts ?? cachedPosts);
  
  const createPost = useMutation(api.posts.createPost);
  const deletePost = useMutation(api.posts.deletePost);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getFileUrl = useMutation(api.files.getFileUrl);

  const filteredPosts = useMemo(() => {
    const posts = displayPosts ?? cachedPosts;
    if (!posts) return [];
    
    // Filtere gelöschte Posts heraus
    return posts.filter((post: any) => !deletedPostIdsRef.current.has(post._id));
  }, [displayPosts, cachedPosts, feedTab]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Bitte wähle ein Bild aus");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Das Bild ist zu groß. Maximal 5MB erlaubt.");
      return;
    }

    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();
      if (!storageId) {
        throw new Error("Keine Storage-ID erhalten");
      }

      const fileUrl = await getFileUrl({ storageId });
      if (fileUrl) {
        setSelectedImage(fileUrl);
      } else {
        throw new Error("Konnte URL nicht abrufen");
      }
    } catch (error) {
      console.error("Fehler beim Hochladen:", error);
      alert("Fehler beim Hochladen des Bildes. Bitte versuche es erneut.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreatePost = async () => {
    if ((!newPost.trim() && !selectedImage) || !currentUser?._id) return;

    const postContent = newPost;
    const postImage = selectedImage;

    const userPostsQueryKey = ["convex", "posts.getUserPosts", { userId: currentUser._id }];
    const currentUserPosts = queryClient.getQueryData(userPostsQueryKey) as any[] | undefined;
    const currentFeedPosts = queryClient.getQueryData(postsQueryKey) as any[] | undefined;

    const tempPostId = `temp-${Date.now()}`;
    const tempPost = {
      _id: tempPostId,
      authorId: currentUser._id,
      content: postContent,
      imageUrl: postImage || undefined,
      createdAt: Date.now(),
      likes: 0,
      author: currentUser,
    };

    if (currentUserPosts) {
      queryClient.setQueryData(userPostsQueryKey, [tempPost, ...currentUserPosts]);
    }

    if (currentFeedPosts) {
      queryClient.setQueryData(postsQueryKey, [tempPost, ...currentFeedPosts]);
    }

    try {
      const postId = await createPost({
        authorId: currentUser._id as any,
        content: postContent,
        imageUrl: postImage || undefined,
      });
      
      // Prüfe ob der Post bereits gelöscht wurde (optimistisch)
      if (deletedPostIdsRef.current.has(tempPostId) || deletedPostIdsRef.current.has(postId)) {
        // Post wurde bereits gelöscht, entferne ihn aus dem Cache und überspringe das Update
        const removePost = (queryKey: any[]) => {
          const cachedData = queryClient.getQueryData(queryKey) as any[] | undefined;
          if (cachedData) {
            const updatedData = cachedData.filter((post: any) => 
              post._id !== tempPostId && post._id !== postId
            );
            queryClient.setQueryData(queryKey, updatedData);
          }
        };
        removePost(postsQueryKey);
        removePost(userPostsQueryKey);
        if (followingPostsQueryKey) {
          removePost(followingPostsQueryKey);
        }
        deletedPostIdsRef.current.delete(tempPostId);
        deletedPostIdsRef.current.delete(postId);
      } else {
        // Ersetze den temporären Post durch den echten Post mit der echten ID
        const replaceTempPost = (queryKey: any[]) => {
          const cachedData = queryClient.getQueryData(queryKey) as any[] | undefined;
          if (cachedData) {
            const updatedData = cachedData.map((post: any) => {
              // Ersetze temporären Post durch echten Post
              if (post._id === tempPostId) {
                return {
                  ...post,
                  _id: postId,
                };
              }
              return post;
            });
            queryClient.setQueryData(queryKey, updatedData);
          }
        };
        
        replaceTempPost(postsQueryKey);
        replaceTempPost(userPostsQueryKey);
        if (followingPostsQueryKey) {
          replaceTempPost(followingPostsQueryKey);
        }
      }
      
      setNewPost("");
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      queryClient.invalidateQueries({ queryKey: postsQueryKey });
      queryClient.invalidateQueries({ queryKey: userPostsQueryKey });
      if (followingPostsQueryKey) {
        queryClient.invalidateQueries({ queryKey: followingPostsQueryKey });
      }
      queryClient.invalidateQueries({ queryKey: ["convex", "posts.getUserPosts"] });
      invalidateQueries();
      
      await Promise.all([
        queryClient.refetchQueries({ queryKey: postsQueryKey }),
        queryClient.refetchQueries({ queryKey: userPostsQueryKey }),
      ]);
    } catch (error) {
      // Entferne temporären Post bei Fehler
      if (currentUserPosts) {
        const updatedUserPosts = currentUserPosts.filter((post: any) => post._id !== tempPostId);
        queryClient.setQueryData(userPostsQueryKey, updatedUserPosts);
      }
      if (currentFeedPosts) {
        const updatedFeedPosts = currentFeedPosts.filter((post: any) => post._id !== tempPostId);
        queryClient.setQueryData(postsQueryKey, updatedFeedPosts);
      }
      console.error("Post erstellen fehlgeschlagen:", error);
    }
  };


  const handleDeletePost = (postId: string) => {
    setDeletePostId(postId);
  };

  const confirmDeletePost = async () => {
    if (!deletePostId || !currentUser?._id) {
      setDeletePostId(null);
      if (!currentUser?._id) {
        showToast("Fehler: User nicht gefunden", "error");
      }
      return;
    }

    // Füge die Post-ID zur Liste der gelöschten Posts hinzu (sowohl temporäre als auch echte)
    deletedPostIdsRef.current.add(deletePostId);

    const removePostFromCache = (queryKey: any[]) => {
      const cachedData = queryClient.getQueryData(queryKey) as any[] | undefined;
      if (cachedData) {
        // Entferne Posts mit der exakten ID (funktioniert für sowohl temporäre als auch echte IDs)
        const updatedData = cachedData.filter((post: any) => post._id !== deletePostId);
        queryClient.setQueryData(queryKey, updatedData);
        return cachedData.find((post: any) => post._id === deletePostId);
      }
      return null;
    };

    const deletedPostFromFeed = removePostFromCache(postsQueryKey);
    const allUserPostsKeys = queryClient.getQueryCache().getAll().map(query => query.queryKey);
    const deletedPostsFromUserPosts: { key: any[]; post: any }[] = [];
    allUserPostsKeys.forEach(key => {
      if (Array.isArray(key) && key[0] === "convex" && key[1] === "posts.getUserPosts") {
        const deletedPost = removePostFromCache(key);
        if (deletedPost) {
          deletedPostsFromUserPosts.push({ key, post: deletedPost });
        }
      }
    });

    if (followingPostsQueryKey) {
      removePostFromCache(followingPostsQueryKey);
    }

    try {
      // Nur löschen, wenn es keine temporäre ID ist
      if (!deletePostId.startsWith("temp-")) {
        await deletePost({ postId: deletePostId as any, userId: currentUser._id as any });
      }
      queryClient.invalidateQueries({ queryKey: postsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["convex", "posts.getUserPosts"] });
      invalidateQueries();
      showToast("Beitrag erfolgreich gelöscht", "success");
      setDeletePostId(null);
      // Entferne die ID aus der Liste nach erfolgreichem Löschen (nach einer kurzen Verzögerung)
      setTimeout(() => {
        deletedPostIdsRef.current.delete(deletePostId);
      }, 5000); // Nach 5 Sekunden entfernen, damit der Post nicht wieder erscheint
    } catch (error) {
      // Bei Fehler entferne die ID aus der Liste
      deletedPostIdsRef.current.delete(deletePostId);
      if (deletedPostFromFeed) {
        const cachedData = queryClient.getQueryData(postsQueryKey) as any[] | undefined;
        if (cachedData) {
          queryClient.setQueryData(postsQueryKey, [deletedPostFromFeed, ...cachedData]);
        }
      }
      deletedPostsFromUserPosts.forEach(({ key, post }) => {
        const cachedData = queryClient.getQueryData(key) as any[] | undefined;
        if (cachedData) {
          queryClient.setQueryData(key, [post, ...cachedData]);
        }
      });
      console.error("Post löschen fehlgeschlagen:", error);
      showToast("Fehler beim Löschen des Posts", "error");
      setDeletePostId(null);
    }
  };

  if (!user || !currentUser) return null;

  if (isInitializing && !posts && !cachedPosts) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[var(--brand)] border-t-transparent" />
          <p className="mt-4 text-slate-500">Lade Feed...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-10 hidden bg-white/70 backdrop-blur-xl lg:block">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h1 className="text-xl font-bold text-slate-900">Feed</h1>
        </div>

        {/* Feed Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setFeedTab("foryou")}
            className={`relative flex-1 px-4 py-4 text-[15px] font-semibold transition hover:bg-slate-50 ${
              feedTab === "foryou" ? "text-slate-900" : "text-slate-500"
            }`}
          >
            <span className="relative inline-block">
              Für dich
              {feedTab === "foryou" && (
                <div className="absolute -bottom-[17px] left-0 right-0 h-1 rounded-full bg-[var(--brand)]" />
              )}
            </span>
          </button>
          <button
            onClick={() => setFeedTab("following")}
            className={`relative flex-1 px-4 py-4 text-[15px] font-semibold transition hover:bg-slate-50 ${
              feedTab === "following" ? "text-slate-900" : "text-slate-500"
            }`}
          >
            <span className="relative inline-block">
              Folge ich
              {feedTab === "following" && (
                <div className="absolute -bottom-[17px] left-0 right-0 h-1 rounded-full bg-[var(--brand)]" />
              )}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Header with Tabs */}
      <header className={`sticky z-[9] bg-white lg:hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform ${
        isHeaderVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`} style={{ top: '57px', marginTop: '-1px', boxShadow: 'none', border: 'none', borderTop: 'none' }}>
        <div className="flex">
          <button
            onClick={() => setFeedTab("foryou")}
            className={`relative flex-1 px-4 py-4 text-[15px] font-semibold transition hover:bg-slate-50 ${
              feedTab === "foryou" ? "text-slate-900" : "text-slate-500"
            }`}
          >
            <span className="relative inline-block">
              Für dich
              {feedTab === "foryou" && (
                <div className="absolute -bottom-[17px] left-0 right-0 h-1 rounded-full bg-[var(--brand)]" />
              )}
            </span>
          </button>
          <button
            onClick={() => setFeedTab("following")}
            className={`relative flex-1 px-4 py-4 text-[15px] font-semibold transition hover:bg-slate-50 ${
              feedTab === "following" ? "text-slate-900" : "text-slate-500"
            }`}
          >
            <span className="relative inline-block">
              Folge ich
              {feedTab === "following" && (
                <div className="absolute -bottom-[17px] left-0 right-0 h-1 rounded-full bg-[var(--brand)]" />
              )}
            </span>
          </button>
        </div>
      </header>

      {/* Post Composer */}
      <div className="p-4">
          <div className="flex gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)] overflow-hidden">
            {currentUser?.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUser.profileImage}
                alt={currentUser.name || user.username || "User"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-semibold">
                {user.name?.charAt(0) || user.username?.charAt(0) || "U"}
              </span>
            )}
          </div>
          <div className="flex-1">
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Was gibt's Neues?"
              className="w-full resize-none border-none text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
              rows={2}
              style={{ fontSize: '16px' }}
            />
            {selectedImage && (
              <div className="relative mt-3 inline-block">
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white transition hover:bg-black/70"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="max-h-96 rounded-2xl border border-slate-200"
                />
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="-ml-2 flex cursor-pointer items-center justify-center rounded-full p-2 text-[var(--brand)] transition hover:bg-[var(--brand)]/10"
              >
                <PhotoIcon className="h-5 w-5" />
              </label>
              <button
                onClick={handleCreatePost}
                disabled={(!newPost.trim() && !selectedImage) || isUploading}
                className="btn-primary rounded-full px-6 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Posten
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div>
        {filteredPosts.length === 0 && !cachedPosts && !displayPosts ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand)] border-t-transparent" />
            <p className="mt-4 text-slate-500">Lade Posts...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-500">Noch keine Posts vorhanden.</p>
            <p className="mt-2 text-sm text-slate-400">Erstelle deinen ersten Post oben!</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <article
              key={post._id}
              className="border-b border-slate-200 p-4 transition hover:bg-slate-50"
            >
              <div className="flex gap-3">
                {post.author?.username ? (
                  <Link
                    href={`/profile/${post.author.username}`}
                    onMouseEnter={() => {
                      if (post.author?.username) {
                        prefetch.prefetchUser(post.author.username).then((userData) => {
                          if (userData?._id) {
                            prefetch.prefetchUserPosts(userData._id);
                          }
                        }).catch(() => {});
                      }
                    }}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)] overflow-hidden transition hover:opacity-80"
                  >
                    {post.author?.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.author.profileImage}
                        alt={post.author.name || post.author.username || "User"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold">
                        {post.author?.name?.charAt(0) || "U"}
                      </span>
                    )}
                  </Link>
                ) : (
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)] overflow-hidden">
                    {post.author?.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.author.profileImage}
                        alt={post.author.name || post.author.username || "User"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold">
                        {post.author?.name?.charAt(0) || "U"}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {post.author?.username ? (
                        <Link
                          href={`/profile/${post.author.username}`}
                          onMouseEnter={() => {
                            if (post.author?.username) {
                              prefetch.prefetchUser(post.author.username).then((userData) => {
                                if (userData?._id) {
                                  prefetch.prefetchUserPosts(userData._id);
                                }
                              }).catch(() => {});
                            }
                          }}
                          className="font-semibold text-slate-900 hover:text-[var(--brand)] transition"
                        >
                          {post.author?.name || "Unbekannt"}
                        </Link>
                      ) : (
                        <span className="font-semibold text-slate-900">
                          {post.author?.name || "Unbekannt"}
                        </span>
                      )}
                      {post.author?.username ? (
                        <Link
                          href={`/profile/${post.author.username}`}
                          onMouseEnter={() => {
                            if (post.author?.username) {
                              prefetch.prefetchUser(post.author.username).then((userData) => {
                                if (userData?._id) {
                                  prefetch.prefetchUserPosts(userData._id);
                                }
                              }).catch(() => {});
                            }
                          }}
                          className="text-sm text-slate-500 hover:text-[var(--brand)] transition"
                        >
                          @{post.author?.username || "unknown"}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-500">
                          @{post.author?.username || "unknown"}
                        </span>
                      )}
                      <span className="text-sm text-slate-400">·</span>
                      <span className="text-sm text-slate-500">
                        {formatRelativeTime(post.createdAt)}
                      </span>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenDropdownId(
                            openDropdownId === post._id ? null : post._id
                          )
                        }
                        className="rounded-full p-2 transition hover:bg-slate-200"
                      >
                        <EllipsisHorizontalIcon className="h-5 w-5 text-slate-500" />
                      </button>
                      {openDropdownId === post._id && (
                        <>
                          {/* Overlay zum Schließen */}
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenDropdownId(null)}
                          />
                          {/* Dropdown Menu */}
                          <div className="absolute right-0 top-10 z-20 w-48 rounded-xl border border-slate-200 bg-white shadow-lg">
                            {currentUser?._id === post.authorId && (
                              <button
                                onClick={() => {
                                  handleDeletePost(post._id);
                                  setOpenDropdownId(null);
                                }}
                                className="flex w-full items-center gap-3 rounded-t-xl px-4 py-3 text-left text-red-600 transition hover:bg-red-50"
                              >
                                <TrashIcon className="h-5 w-5" />
                                <span>Löschen</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-slate-900">{post.content}</p>
                  {post.imageUrl && (
                    <PostImage
                      src={post.imageUrl}
                      alt="Post image"
                      onClick={() => setSelectedImageUrl(post.imageUrl!)}
                    />
                  )}
                  <div className="mt-3 flex items-center gap-6">
                    <PostLikeButton
                      postId={post._id}
                      userId={currentUser?._id}
                      likes={post.likes || 0}
                      postsQueryKey={postsQueryKey}
                      likedPostIds={likedPostIds}
                    />
                    <button className="group flex items-center gap-2 text-slate-500 transition hover:text-blue-500">
                      <div className="rounded-full p-2 transition group-hover:bg-blue-50">
                        <ChatBubbleOvalLeftIcon className="h-5 w-5" />
                      </div>
                      <span className="text-sm">0</span>
                    </button>
                    <button className="group flex items-center gap-2 text-slate-500 transition hover:text-green-500">
                      <div className="rounded-full p-2 transition group-hover:bg-green-50">
                        <ArrowPathIcon className="h-5 w-5" />
                      </div>
                      <span className="text-sm">0</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
      <DeletePostModal
        isOpen={deletePostId !== null}
        onClose={() => setDeletePostId(null)}
        onConfirm={confirmDeletePost}
      />
      {selectedImageUrl && (
        <ImageModal
          imageUrl={selectedImageUrl}
          isOpen={true}
          onClose={() => setSelectedImageUrl(null)}
        />
      )}
    </>
  );
}

