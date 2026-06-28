"use client";

import { Plus, MessageCircle } from "lucide-react";
import { HomeIcon } from "@/components/home-icon";
import { SearchIcon } from "@/components/search-icon";
import { WorkspaceIcon } from "@/components/workspace-icon";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useCurrentUser();

  const unreadData = useQuery(api.queries.getUnreadCounts, currentUser ? { userId: currentUser._id } : "skip");
  const unreadChatCount = unreadData?.totalUnread || 0;

  const isActive = (path: string) => {
    // Sowohl "/" als auch "/home" als Startseite betrachten
    if (path === "/home" || path === "/") {
      return pathname === "/home" || pathname === "/";
    }
    if (path === "/chat") {
      return pathname === "/chat" || pathname.startsWith("/chat/");
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

  const handleHomeClick = (e: React.MouseEvent) => {
    // Wenn bereits auf /home, scroll nach oben statt zu navigieren
    if (pathname === "/home" || pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    // Ansonsten lässt der Link die Navigation automatisch zu /home
  };

  return (
    <>
      {/* Floating Create Button - unten rechts, nur auf /home und nur Mobile */}
      {isActive("/home") && (
        <Link
          id="tour-nav-create"
          href="/create"
          prefetch={true}
          onClick={handleCreateClick}
          aria-label="Beitrag erstellen"
          className="fixed right-4 z-50 flex lg:hidden items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer touch-manipulation bottom-[calc(94px+env(safe-area-inset-bottom,0px))]"
          style={{
            width: "48px",
            height: "48px",
            backgroundColor: "#D08945",
            willChange: "transform",
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden"
          }}
        >
          <Plus
            style={{
              width: "26px",
              height: "26px",
              color: "#FFFFFF",
              transform: isActive("/create") ? "rotate(45deg) translateZ(0)" : "rotate(0deg) translateZ(0)",
              transition: "transform 0.2s ease",
              willChange: "transform",
              backfaceVisibility: "hidden"
            }}
          />
        </Link>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 flex justify-center px-4 pb-safe-bottom z-50 mb-4 lg:bottom-auto lg:top-1/2 lg:transform lg:-translate-y-1/2 lg:left-12 lg:right-auto lg:mb-0 lg:pb-0 lg:px-0 lg:h-auto lg:w-auto"
      >
        <div
          className="flex items-center justify-between px-5 py-4 w-full max-w-[373px] h-[66px] rounded-[79px] lg:flex-col lg:items-center lg:justify-start lg:gap-5 lg:px-4 lg:py-5 lg:w-[66px] lg:h-auto lg:max-w-none"
          style={{
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
            id="tour-nav-home"
            href="/home"
            prefetch={true}
            onClick={handleHomeClick}
            className="flex items-center justify-center transition-transform active:scale-95 cursor-pointer touch-manipulation"
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
            id="tour-nav-search"
            href="/search"
            prefetch={true}
            className="flex items-center justify-center transition-transform active:scale-95 cursor-pointer touch-manipulation"
            style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px", opacity: 1 }}
          >
            <SearchIcon
              isActive={isActive("/search")}
              size={32}
              color="#000000"
            />
          </Link>

          {/* Workspace */}
          <Link
            id="tour-nav-workspace"
            href="/workspace"
            prefetch={true}
            className="flex items-center justify-center transition-transform active:scale-95 cursor-pointer touch-manipulation"
            style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px", opacity: 1 }}
          >
            <WorkspaceIcon
              isActive={isActive("/workspace")}
              size={28}
              color="#000000"
            />
          </Link>

          {/* Create - nur Mobile */}
          <Link
            id="tour-nav-create"
            href="/create"
            prefetch={true}
            onClick={handleCreateClick}
            className="flex lg:hidden items-center justify-center transition-transform active:scale-95 cursor-pointer touch-manipulation"
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

          {/* Chat */}
          <Link
            id="tour-nav-chat"
            href="/chat"
            prefetch={true}
            className="flex items-center justify-center transition-transform active:scale-95 cursor-pointer touch-manipulation relative"
            style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px", opacity: 1 }}
          >
            <MessageCircle
              style={{
                width: "27px",
                height: "27px",
                color: "#000000",
                fill: isActive("/chat") ? "#000000" : "none",
                willChange: "transform",
                transform: "translateY(-2px) translateZ(0)",
                backfaceVisibility: "hidden"
              }}
            />
            {unreadChatCount > 0 && (
              <div className="absolute top-2 right-2 w-3 h-3 bg-[#f78d57] rounded-full border border-[#f78d57]" />
            )}
          </Link>
        </div>
      </nav>
    </>
  );
}