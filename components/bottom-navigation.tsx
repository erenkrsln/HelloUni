"use client";

import { Plus, Bell, MessageCircle } from "lucide-react";
import { HomeIcon } from "@/components/home-icon";
import { SearchIcon } from "@/components/search-icon";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useQuery } from "convex/react"; // Added
import { api } from "@/convex/_generated/api"; // Added
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"; // Added

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const unreadData = useQuery(api.queries.getUnreadCounts, currentUser ? { userId: currentUser._id } : "skip");
  const unreadCount = unreadData?.totalUnread || 0;

  const isActive = (path: string) => {
    // Sowohl "/" als auch "/home" als Startseite betrachten
    if (path === "/home" || path === "/") {
      return pathname === "/home" || pathname === "/";
    }
    return pathname === path;
  };

  const handleCreateClick = (e: React.MouseEvent) => {
    // Wenn bereits auf /create, zu /home navigieren
    if (pathname === "/create") {
      e.preventDefault();
      router.push("/home");
    }
    // Ansonsten lässt der Link die Navigation automatisch zu /create
  };

  return (
    <nav
      className="fixed bottom-4 left-0 right-0 flex justify-center px-4 z-50"
      style={{
        bottom: "0.5rem",
        // iOS Safari: Safe Area für Home Indicator
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))"
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{
          width: "100%",
          maxWidth: "373px",
          height: "66px",
          borderRadius: "79px",
          backgroundColor: "#dcc6a1",
          opacity: 1,
          willChange: "transform",
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden"
        }}
      >
        {/* Home - ganz links */}
        <Link
          href="/home"
          prefetch={true}
          className="flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer touch-manipulation"
          style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px", opacity: 1 }}
        >
          <HomeIcon
            isActive={isActive("/home")}
            size={32}
            color="#000000"
          />
        </Link>

        {/* Search */}
        <Link
          href="/search"
          prefetch={true}
          className="flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer touch-manipulation"
          style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px", opacity: 1 }}
        >
          <SearchIcon
            isActive={isActive("/search")}
            size={32}
            color="#000000"
          />
        </Link>

        {/* Create */}
        <Link
          href="/create"
          prefetch={true}
          onClick={handleCreateClick}
          className="flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer touch-manipulation"
          style={{
            width: "44px",
            height: "44px",
            minWidth: "44px",
            minHeight: "44px",
            opacity: 1
          }}
        >
          <Plus
            style={{
              width: "32px",
              height: "32px",
              color: "#000000",
              fill: isActive("/create") ? "#000000" : "none",
              transform: isActive("/create") ? "rotate(45deg) translateZ(0)" : "rotate(0deg) translateZ(0)",
              transition: "transform 0.2s ease",
              willChange: "transform",
              backfaceVisibility: "hidden"
            }}
          />
        </Link>

        {/* Notifications */}
        <Link
          href="/notifications"
          prefetch={true}
          className="flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer touch-manipulation relative"
          style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px", opacity: 1 }}
        >
          <Bell
            style={{
              width: "28px",
              height: "28px",
              color: "#000000",
              fill: isActive("/notifications") ? "#000000" : "none",
              willChange: "transform",
              transform: "translateZ(0)",
              backfaceVisibility: "hidden"
            }}
          />
        </Link>

        {/* Chat */}
        <Link
          href="/chat"
          prefetch={true}
          className="flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer touch-manipulation relative"
          style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px", opacity: 1 }}
        >
          <MessageCircle
            style={{
              width: "28px",
              height: "28px",
              color: "#000000",
              fill: isActive("/chat") ? "#000000" : "none",
              willChange: "transform",
              transform: "translateY(-1px) translateZ(0)",
              backfaceVisibility: "hidden"
            }}
          />
          {unreadCount > 0 && (
            <div className="absolute top-2 right-2 w-3 h-3 bg-[#f78d57] rounded-full border border-[#f78d57]" />
          )}
        </Link>
      </div>
    </nav>
  );
}

