"use client";

import { Home, MessageCircle, Plus, Calendar, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNavigation() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed bottom-4 left-0 right-0 flex justify-center px-4 z-50">
      <div
        className="flex items-center justify-between px-5 py-4 transition-all"
        style={{
          width: "100%",
          maxWidth: "373px",
          height: "66px",
          borderRadius: "79px",
          background: "linear-gradient(to right, #D08945 0%, #DCA067 33.226%, #F4CFAB 100%)",
          opacity: 0.6
        }}
      >
        <Link
          href="/"
          className="flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer touch-manipulation"
          style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px" }}
        >
          <Home
            className="transition-all"
            style={{
              width: "40px",
              height: "40px",
              color: "#FFFFFF",
              fill: isActive("/") ? "#FFFFFF" : "none"
            }}
          />
        </Link>
        <Link
          href="/chat"
          className="flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer touch-manipulation"
          style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px" }}
        >
          <MessageCircle
            className="transition-all"
            style={{
              width: "40px",
              height: "40px",
              color: "#FFFFFF",
              fill: isActive("/chat") ? "#FFFFFF" : "none"
            }}
          />
        </Link>
        <Link
          href="/create"
          className="flex items-center justify-center transition-transform hover:scale-125 active:scale-110 cursor-pointer touch-manipulation"
          style={{ width: "61px", height: "58px", minWidth: "61px", minHeight: "58px" }}
        >
          <img
            src="/create-icon.png"
            alt="Plus"
            loading="eager"
            style={{
              width: "61px",
              height: "58px",
              objectFit: "contain",
              display: "block",
              transform: isActive("/create") ? "rotate(45deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease"
            }}
          />
        </Link>
        <Link
          href="/search"
          className="flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer touch-manipulation"
          style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px" }}
        >
          <Search
            className="transition-all"
            style={{
              width: "40px",
              height: "40px",
              color: "#FFFFFF",
              fill: isActive("/search") ? "#FFFFFF" : "none"
            }}
          />
        </Link>
        <Link
          href="/calendar"
          className="flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer touch-manipulation"
          style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px" }}
        >
          <Calendar
            className="transition-all"
            style={{
              width: "40px",
              height: "40px",
              color: "#FFFFFF",
              fill: isActive("/calendar") ? "#FFFFFF" : "none"
            }}
          />
        </Link>
      </div>
    </nav>
  );
}

