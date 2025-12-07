"use client";

import { Home, MessageCircle, Plus, Calendar, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();

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
          href="/home"
          prefetch={true}
          className="flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer touch-manipulation"
          style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px", opacity: 1 }}
        >
          <Home
            className="transition-all"
            style={{
              width: "40px",
              height: "40px",
              color: "#FFFFFF",
              fill: isActive("/home") ? "#FFFFFF" : "none"
            }}
          />
        </Link>
        <Link
          href="/chat"
          prefetch={true}
          className="flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer touch-manipulation"
          style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px", opacity: 1 }}
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
          prefetch={true}
          onClick={handleCreateClick}
          className="flex items-center justify-center cursor-pointer touch-manipulation"
          style={{ 
            width: "61px", 
            height: "58px", 
            minWidth: "61px", 
            minHeight: "58px", 
            opacity: 1,
            transition: "transform 0.1s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
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
          prefetch={true}
          className="flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer touch-manipulation"
          style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px", opacity: 1 }}
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
          prefetch={true}
          className="flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer touch-manipulation"
          style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px", opacity: 1 }}
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

