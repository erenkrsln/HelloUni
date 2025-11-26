"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/convex/_generated/api";
import { useInvalidateConvexQueries } from "@/lib/convex-query-hooks";
import { LogoMark } from "@/components/logo";
import { PostSkeleton } from "@/components/post-skeleton";
import {
  HomeIcon,
  MagnifyingGlassIcon,
  BellIcon,
  EnvelopeIcon,
  UserCircleIcon,
  PlusIcon,
  HeartIcon,
  ChatBubbleOvalLeftIcon,
  ArrowPathIcon,
  EllipsisHorizontalIcon,
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  username?: string;
};

export function FeedClient({ user }: { user: User }) {
  const [newPost, setNewPost] = useState("");
  const [feedTab, setFeedTab] = useState<"foryou" | "following">("foryou");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const invalidateQueries = useInvalidateConvexQueries();

  const postsQueryKey = ["convex", "posts.getPosts", { limit: 50 }];
  const posts = useQuery(api.posts.getPosts, { limit: 50 });
  
  useEffect(() => {
    if (posts) {
      queryClient.setQueryData(postsQueryKey, posts);
    }
  }, [posts, queryClient, postsQueryKey]);
  
  const createPost = useMutation(api.posts.createPost);
  const likePost = useMutation(api.posts.likePost);

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;

    try {
      await createPost({
        authorId: user.id as any,
        content: newPost,
      });
      setNewPost("");
      invalidateQueries();
    } catch (error) {
      console.error("Post erstellen fehlgeschlagen:", error);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await likePost({ postId });
      invalidateQueries();
    } catch (error) {
      console.error("Like fehlgeschlagen:", error);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  return (
    <div className="flex h-screen justify-center overflow-hidden bg-[#f6f7fb]">
      <div className="flex h-full w-full max-w-7xl bg-white pb-16 lg:pb-0">
        {/* Sidebar */}
        <aside className="hidden h-full w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white p-4 lg:flex xl:w-72">
        <div className="mb-8 flex items-center gap-3">
          <LogoMark className="h-8 w-8" />
          <span className="text-xl font-bold text-slate-900">HelloUni</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button className="flex w-full items-center gap-4 rounded-xl bg-[var(--brand)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--brand)]/90">
            <HomeIcon className="h-6 w-6" />
            <span>Feed</span>
          </button>
          <button className="flex w-full items-center gap-4 rounded-xl px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-100">
            <MagnifyingGlassIcon className="h-6 w-6" />
            <span>Entdecken</span>
          </button>
          <button className="flex w-full items-center gap-4 rounded-xl px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-100">
            <BellIcon className="h-6 w-6" />
            <span>Benachrichtigungen</span>
          </button>
          <button className="flex w-full items-center gap-4 rounded-xl px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-100">
            <EnvelopeIcon className="h-6 w-6" />
            <span>Nachrichten</span>
          </button>
          <button
            onClick={() => router.push(`/profile/${user.username}`)}
            className="flex w-full items-center gap-4 rounded-xl px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <UserCircleIcon className="h-6 w-6" />
            <span>Profil</span>
          </button>
        </nav>

        <div className="mb-4" />

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl p-3 transition hover:bg-slate-100"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
            <span className="text-sm font-semibold">
              {user.name?.charAt(0) || user.username?.charAt(0) || "U"}
            </span>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">@{user.username}</p>
          </div>
        </button>
      </aside>

        {/* Main Feed */}
        <main className="flex-1 overflow-y-auto bg-white scrollbar-hide">
          <div className="border-r border-slate-200 bg-white xl:border-r-0">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-white/70 backdrop-blur-xl">
            {/* Mobile Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 lg:hidden">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)] transition hover:bg-[var(--brand)]/20"
              >
                <span className="text-sm font-semibold">
                  {user.name?.charAt(0) || user.username?.charAt(0) || "U"}
                </span>
              </button>
              <LogoMark className="h-8 w-8" />
            </div>
            {/* Desktop Header */}
            <div className="hidden items-center justify-between border-b border-slate-200 px-4 py-3 lg:flex">
              <h1 className="text-xl font-bold text-slate-900">Feed</h1>
            </div>
            
            {/* Feed Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setFeedTab("foryou")}
                className={`relative flex-1 px-4 py-4 text-[15px] font-semibold transition hover:bg-slate-50 ${
                  feedTab === "foryou"
                    ? "text-slate-900"
                    : "text-slate-500"
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
                  feedTab === "following"
                    ? "text-slate-900"
                    : "text-slate-500"
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
          <div className="border-b border-slate-200 p-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
                <span className="text-sm font-semibold">
                  {user.name?.charAt(0) || user.username?.charAt(0) || "U"}
                </span>
              </div>
              <div className="flex-1">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Was gibt's Neues?"
                  className="w-full resize-none border-none text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  rows={3}
                />
                <div className="mt-3 flex items-center justify-between">
                  <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--brand)] transition hover:bg-[var(--brand)]/10">
                    <PhotoIcon className="h-5 w-5" />
                    Bild
                  </button>
                  <button
                    onClick={handleCreatePost}
                    disabled={!newPost.trim()}
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
            {posts === undefined ? (
              <div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <PostSkeleton key={i} />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-500">Noch keine Posts vorhanden.</p>
                <p className="mt-2 text-sm text-slate-400">Erstelle deinen ersten Post oben!</p>
              </div>
            ) : (
              posts.map((post) => (
                <article
                  key={post._id}
                  className="border-b border-slate-200 p-4 transition hover:bg-slate-50"
                >
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
                      <span className="text-sm font-semibold">
                        {post.author?.name?.charAt(0) || "U"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {post.author?.name || "Unbekannt"}
                          </span>
                          <span className="text-sm text-slate-500">
                            @{post.author?.username || "unknown"}
                          </span>
                          <span className="text-sm text-slate-400">·</span>
                          <span className="text-sm text-slate-500">
                            {new Date(post.createdAt).toLocaleDateString("de-DE", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <button className="rounded-full p-2 transition hover:bg-slate-200">
                          <EllipsisHorizontalIcon className="h-5 w-5 text-slate-500" />
                        </button>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-slate-900">{post.content}</p>
                      {post.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.imageUrl}
                          alt="Post image"
                          className="mt-3 rounded-2xl border border-slate-200"
                        />
                      )}
                      <div className="mt-3 flex items-center gap-6">
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
                        <button
                          onClick={() => handleLike(post._id)}
                          className="group flex items-center gap-2 text-slate-500 transition hover:text-red-500"
                        >
                          <div className="rounded-full p-2 transition group-hover:bg-red-50">
                            <HeartIcon className="h-5 w-5" />
                          </div>
                          <span className="text-sm">{post.likes}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </main>

        {/* Right Sidebar (optional) */}
        <aside className="hidden h-full w-80 flex-shrink-0 border-l border-slate-200 bg-white p-4 xl:block">
        <div className="rounded-2xl bg-slate-50 p-4">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Vorschläge für dich</h2>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                    <span className="text-sm font-semibold text-slate-600">U</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Student {i}</p>
                    <p className="text-xs text-slate-500">@student{i}</p>
                  </div>
                </div>
                <button className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800">
                  Folgen
                </button>
              </div>
            ))}
          </div>
        </div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white lg:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          <button className="flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-[var(--brand)]">
            <HomeIcon className="h-6 w-6" />
            <span className="text-xs font-medium">Feed</span>
          </button>
          <button className="flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-slate-600">
            <MagnifyingGlassIcon className="h-6 w-6" />
            <span className="text-xs font-medium">Suchen</span>
          </button>
          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-lg">
            <PlusIcon className="h-6 w-6" />
          </button>
          <button className="flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-slate-600">
            <BellIcon className="h-6 w-6" />
            <span className="text-xs font-medium">Alerts</span>
          </button>
          <button className="flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-slate-600">
            <EnvelopeIcon className="h-6 w-6" />
            <span className="text-xs font-medium">Chat</span>
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <>
        {/* Overlay */}
        <div
          className={`fixed inset-0 z-30 bg-black/50 transition-opacity duration-300 ease-in-out lg:hidden ${
            isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setIsSidebarOpen(false)}
        />
        {/* Sidebar */}
        <div
          className={`fixed left-0 top-0 z-40 h-full w-64 bg-white shadow-xl transition-transform duration-300 ease-in-out lg:hidden ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
                    <span className="text-sm font-semibold">
                      {user.name?.charAt(0) || user.username?.charAt(0) || "U"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">@{user.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="rounded-full p-2 transition hover:bg-slate-100"
                >
                  <XMarkIcon className="h-5 w-5 text-slate-600" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 space-y-1 p-4">
                <button
                  onClick={() => {
                    router.push(`/profile/${user.username}`);
                    setIsSidebarOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  <UserCircleIcon className="h-6 w-6" />
                  <span>Profil</span>
                </button>
                <button
                  onClick={async () => {
                    await handleLogout();
                    setIsSidebarOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-red-600 transition hover:bg-red-50"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Abmelden</span>
                </button>
              </div>
            </div>
          </div>
      </>
    </div>
  );
}

