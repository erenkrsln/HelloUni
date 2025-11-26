"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LogoMark } from "@/components/logo";
import { usePrefetchConvexQuery } from "@/lib/convex-query-hooks";
import {
  HomeIcon,
  MagnifyingGlassIcon,
  BellIcon,
  EnvelopeIcon,
  UserCircleIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  username?: string;
};

type UserData = {
  _id: string;
  name: string;
  username: string;
  profileImage?: string;
  bio?: string;
  university?: string;
} | null;

export function AppLayoutClient({
  children,
  user,
  initialUserData,
}: {
  children: React.ReactNode;
  user: User;
  initialUserData?: UserData;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const prefetch = usePrefetchConvexQuery();

  const currentUser = useQuery(
    api.users.getUserByUsername,
    user?.username ? { username: user.username } : "skip"
  );

  const displayUser = currentUser ?? initialUserData;

  const handlePrefetchFeed = () => {
    prefetch.prefetchPosts();
  };

  const handlePrefetchProfile = () => {
    if (user?.username) {
      prefetch.prefetchUser(user.username).then((userData) => {
        if (userData?._id) {
          prefetch.prefetchUserPosts(userData._id);
        }
      }).catch(() => {});
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex h-screen justify-center overflow-hidden bg-[#f6f7fb]">
      <div className="flex h-full w-full max-w-7xl bg-white pb-16 lg:pb-0">
        {/* Left Sidebar - Desktop */}
        <aside className="hidden h-full w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white p-4 lg:flex xl:w-72">
          <div className="mb-8 flex items-center gap-3">
            <LogoMark className="h-8 w-8" />
            <span className="text-xl font-bold text-slate-900">HelloUni</span>
          </div>

          <nav className="flex-1 space-y-2">
            <Link
              href="/feed"
              onMouseEnter={handlePrefetchFeed}
              className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 font-medium transition ${
                isActive("/feed")
                  ? "bg-[var(--brand)] text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <HomeIcon className="h-6 w-6" />
              <span>Feed</span>
            </Link>
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
            <Link
              href={`/profile/${user.username}`}
              onMouseEnter={handlePrefetchProfile}
              className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 font-medium transition ${
                pathname.startsWith("/profile")
                  ? "bg-slate-100 text-[var(--brand)] font-semibold"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <UserCircleIcon className="h-6 w-6" />
              <span>Profil</span>
            </Link>
          </nav>

          <div className="mb-4" />

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl p-3 transition hover:bg-slate-100"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)] overflow-hidden">
              {displayUser?.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayUser.profileImage}
                  alt={displayUser.name || user.username || "User"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold">
                  {user.name?.charAt(0) || user.username?.charAt(0) || "U"}
                </span>
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">@{user.username}</p>
            </div>
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-white scrollbar-hide">
          <div className="border-r border-slate-200 bg-white xl:border-r-0">
            {/* Mobile Header - Hidden on profile pages */}
            {!pathname.startsWith("/profile") && (
              <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/70 backdrop-blur-xl lg:hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)] transition hover:bg-[var(--brand)]/20 overflow-hidden"
                  >
                    {displayUser?.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={displayUser.profileImage}
                        alt={displayUser.name || user.username || "User"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold">
                        {user.name?.charAt(0) || user.username?.charAt(0) || "U"}
                      </span>
                    )}
                  </button>
                  <LogoMark className="h-8 w-8" />
                </div>
              </header>
            )}

            {children}
          </div>
        </main>

        {/* Right Sidebar - Desktop */}
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
      <nav className="fixed left-0 right-0 z-20 border-t border-slate-200 bg-white lg:hidden" style={{ bottom: 'env(safe-area-inset-bottom)', paddingBottom: '8px' }}>
        <div className="flex items-center justify-around px-2 py-2">
          <Link
            href="/feed"
            onMouseEnter={handlePrefetchFeed}
            className={`flex flex-col items-center gap-1 rounded-lg px-4 py-2 ${
              isActive("/feed") ? "text-[var(--brand)]" : "text-slate-600"
            }`}
          >
            <HomeIcon className="h-6 w-6" />
            <span className="text-xs font-medium">Feed</span>
          </Link>
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
            isSidebarOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)] overflow-hidden">
                    {displayUser?.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={displayUser.profileImage}
                        alt={displayUser.name || user.username || "User"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold">
                        {user.name?.charAt(0) || user.username?.charAt(0) || "U"}
                      </span>
                    )}
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
              <Link
                href={`/profile/${user.username}`}
                onMouseEnter={handlePrefetchProfile}
                onClick={() => setIsSidebarOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <UserCircleIcon className="h-6 w-6" />
                <span>Profil</span>
              </Link>
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

