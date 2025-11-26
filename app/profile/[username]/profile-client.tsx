"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/convex/_generated/api";
import { LogoMark } from "@/components/logo";
import {
  ArrowLeftIcon,
  CalendarIcon,
  LinkIcon,
  MapPinIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  BellIcon,
  EnvelopeIcon,
  UserCircleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  username?: string;
};

type TabType = "posts" | "replies" | "media";

export function ProfileClient({
  currentUser,
  username,
}: {
  currentUser: User;
  username: string;
}) {
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const router = useRouter();
  const queryClient = useQueryClient();

  const profileUser = useQuery(api.users.getUserByUsername, { username });
  const userPostsQuery = useQuery(
    api.posts.getUserPosts,
    profileUser?._id ? { userId: profileUser._id } : "skip"
  );

  const userPostsQueryKey = profileUser?._id 
    ? ["convex", "posts.getUserPosts", { userId: profileUser._id }]
    : null;

  useEffect(() => {
    if (userPostsQuery && profileUser?._id) {
      queryClient.setQueryData(userPostsQueryKey!, userPostsQuery);
    }
  }, [userPostsQuery, profileUser?._id, queryClient, userPostsQueryKey]);

  const userPosts = userPostsQuery;

  const isOwnProfile = currentUser.username === username;

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  if (profileUser === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[var(--brand)] border-t-transparent" />
          <p className="mt-4 text-slate-500">Lade Profil...</p>
        </div>
      </div>
    );
  }

  if (profileUser === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Profil nicht gefunden</h1>
          <p className="mt-2 text-slate-500">@{username} existiert nicht.</p>
          <button
            onClick={() => router.push("/feed")}
            className="btn-primary mt-4 rounded-full px-6 py-2"
          >
            Zurück zum Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen justify-center overflow-hidden bg-[#f6f7fb]">
      <div className="flex h-full w-full max-w-7xl bg-white pb-16 lg:pb-0">
        {/* Left Sidebar */}
        <aside className="hidden h-full w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white p-4 lg:flex xl:w-72">
          <div className="mb-8 flex items-center gap-3">
            <LogoMark className="h-8 w-8" />
            <span className="text-xl font-bold text-slate-900">HelloUni</span>
          </div>

          <nav className="flex-1 space-y-2">
            <button
              onClick={() => router.push("/feed")}
              className="flex w-full items-center gap-4 rounded-xl px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-100"
            >
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
            <button className="flex w-full items-center gap-4 rounded-xl bg-[var(--brand)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--brand)]/90">
              <UserCircleIcon className="h-6 w-6" />
              <span>Profil</span>
            </button>
          </nav>

          <div className="mb-4" />

          <div className="rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
                <span className="text-sm font-semibold">
                  {currentUser.name?.charAt(0) || currentUser.username?.charAt(0) || "U"}
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {currentUser.name}
                </p>
                <p className="truncate text-xs text-slate-500">@{currentUser.username}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main Profile Content */}
        <main className="flex-1 overflow-y-auto bg-white scrollbar-hide">
          <div className="border-r border-slate-200 bg-white xl:border-r-0">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/70 backdrop-blur-xl">
              <div className="flex items-center gap-8 px-4 py-3">
                <button
                  onClick={() => router.back()}
                  className="rounded-full p-2 transition hover:bg-slate-100"
                >
                  <ArrowLeftIcon className="h-5 w-5 text-slate-900" />
                </button>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-slate-900">{profileUser.name}</h1>
                  <p className="text-sm text-slate-500">{userPosts?.length || 0} Posts</p>
                </div>
              </div>
            </header>

            {/* Profile Header */}
            <div>
              {/* Cover Image */}
              <div className="h-48 bg-gradient-to-r from-orange-400 to-pink-400" />

              {/* Profile Info */}
              <div className="px-4">
                <div className="flex items-start justify-between">
                  {/* Avatar */}
                  <div className="-mt-16 flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-[var(--brand)]/10">
                    <span className="text-4xl font-bold text-[var(--brand)]">
                      {profileUser.name?.charAt(0) || username.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Edit/Follow Button */}
                  <div className="mt-3">
                    {isOwnProfile ? (
                      <button className="rounded-full border border-slate-300 px-6 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
                        Profil bearbeiten
                      </button>
                    ) : (
                      <button className="btn-primary rounded-full px-6 py-2 text-sm font-semibold">
                        Folgen
                      </button>
                    )}
                  </div>
                </div>

                {/* User Details */}
                <div className="mt-4 space-y-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{profileUser.name}</h2>
                    <p className="text-slate-500">@{profileUser.username}</p>
                  </div>

                  <p className="text-slate-900">
                    Student · Leidenschaft für Coding und Kaffee ☕
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="h-4 w-4" />
                      <span>Deutschland</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <LinkIcon className="h-4 w-4" />
                      <a href="#" className="text-[var(--brand)] hover:underline">
                        hellouni.app
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Beigetreten Nov 2025</span>
                    </div>
                  </div>

                  <div className="flex gap-4 text-sm">
                    <button className="transition hover:underline">
                      <span className="font-semibold text-slate-900">245</span>
                      <span className="text-slate-500"> Folge ich</span>
                    </button>
                    <button className="transition hover:underline">
                      <span className="font-semibold text-slate-900">1.2K</span>
                      <span className="text-slate-500"> Follower</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-6 flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab("posts")}
                  className={`relative flex-1 px-4 py-4 text-[15px] font-semibold transition hover:bg-slate-50 ${
                    activeTab === "posts" ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  <span className="relative inline-block">
                    Posts
                    {activeTab === "posts" && (
                      <div className="absolute -bottom-[17px] left-0 right-0 h-1 rounded-full bg-[var(--brand)]" />
                    )}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("replies")}
                  className={`relative flex-1 px-4 py-4 text-[15px] font-semibold transition hover:bg-slate-50 ${
                    activeTab === "replies" ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  <span className="relative inline-block">
                    Antworten
                    {activeTab === "replies" && (
                      <div className="absolute -bottom-[17px] left-0 right-0 h-1 rounded-full bg-[var(--brand)]" />
                    )}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("media")}
                  className={`relative flex-1 px-4 py-4 text-[15px] font-semibold transition hover:bg-slate-50 ${
                    activeTab === "media" ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  <span className="relative inline-block">
                    Medien
                    {activeTab === "media" && (
                      <div className="absolute -bottom-[17px] left-0 right-0 h-1 rounded-full bg-[var(--brand)]" />
                    )}
                  </span>
                </button>
              </div>

              {/* Posts */}
              <div>
                {activeTab === "posts" && (
                  <div>
                    {userPosts === undefined ? (
                      <div className="py-12 text-center text-slate-500">Lade Posts...</div>
                    ) : userPosts.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="font-semibold text-slate-900">Noch keine Posts</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {isOwnProfile
                            ? "Erstelle deinen ersten Post!"
                            : `@${username} hat noch nichts gepostet.`}
                        </p>
                      </div>
                    ) : (
                      userPosts.map((post) => (
                        <article
                          key={post._id}
                          className="border-b border-slate-200 p-4 transition hover:bg-slate-50"
                        >
                          <div className="flex gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
                              <span className="text-sm font-semibold">
                                {profileUser.name?.charAt(0) || "U"}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900">
                                  {profileUser.name}
                                </span>
                                <span className="text-sm text-slate-500">
                                  @{profileUser.username}
                                </span>
                                <span className="text-sm text-slate-400">·</span>
                                <span className="text-sm text-slate-500">
                                  {new Date(post.createdAt).toLocaleDateString("de-DE", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                              </div>
                              <p className="mt-2 whitespace-pre-wrap text-slate-900">
                                {post.content}
                              </p>
                              <div className="mt-3 flex items-center gap-6 text-slate-500">
                                <span className="text-sm">{post.likes?.length || 0} Likes</span>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                )}

                {activeTab === "replies" && (
                  <div className="py-12 text-center text-slate-500">
                    Keine Antworten vorhanden
                  </div>
                )}

                {activeTab === "media" && (
                  <div className="py-12 text-center text-slate-500">Keine Medien vorhanden</div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="hidden h-full w-80 flex-shrink-0 border-l border-slate-200 bg-white p-4 xl:block">
          <div className="rounded-2xl bg-slate-50 p-4">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Vorschläge für dich</h2>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                      <span className="text-sm font-semibold">U</span>
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
          <button
            onClick={() => router.push("/feed")}
            className="flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-slate-600"
          >
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
    </div>
  );
}
