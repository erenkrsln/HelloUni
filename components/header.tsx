"use client";

import { User, LogOut, Bell } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { LogoSidebar } from "@/components/logo-sidebar";
import Image from "next/image";

import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { globalLoadedImagesCache } from "@/lib/cache/imageCache";
import { authClient } from "@/lib/auth-client";
import { NotificationFeed } from "@/components/notification-feed";
import { NotificationSettingsMenu } from "@/components/notification-settings-menu";

interface HeaderProps {
  onMenuClick?: () => void;
  onEditClick?: () => void;
  title?: string;
}

export function Header({ onMenuClick, onEditClick, title }: HeaderProps = {}) {
  const [isProfileHovered, setIsProfileHovered] = useState(false);
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  const [isLogoSidebarOpen, setIsLogoSidebarOpen] = useState(false);
  const { isPending } = authClient.useSession();
  const pathname = usePathname();
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();

  // Ungelesene Benachrichtigungen (für das Glocken-Icon im Header)
  const notificationData = useQuery(
    api.notifications.get,
    currentUser ? { userId: currentUser._id } : "skip"
  );
  const unreadNotificationCount = notificationData?.unreadCount || 0;

  // Drei Zustände:
  // 1. currentUser === undefined → User lädt noch (zeige grauen pulsierenden Kreis)
  // 2. currentUser geladen aber kein image → zeige Fallback-Icon
  // 3. currentUser.image vorhanden → zeige Bild

  // Avatar Image Loading State (nur relevant wenn User geladen UND Bild vorhanden)
  const [imageLoaded, setImageLoaded] = useState(() => {
    return currentUser?.image ? globalLoadedImagesCache.has(currentUser.image) : false;
  });

  // Aktualisiere imageLoaded State, wenn sich das Bild ändert
  useEffect(() => {
    if (currentUser?.image) {
      const wasLoaded = globalLoadedImagesCache.has(currentUser.image);
      setImageLoaded(wasLoaded);
    } else {
      setImageLoaded(false);
    }
  }, [currentUser?.image]);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Close notifications popup when page pathname changes
  useEffect(() => {
    setIsNotificationsOpen(false);
  }, [pathname]);

  // Close notifications popup when clicking outside
  useEffect(() => {
    if (!isNotificationsOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".notifications-popup") && !target.closest(".bell-button")) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotificationsOpen]);

  const handleBellClick = (e: React.MouseEvent) => {
    if (window.innerWidth >= 768) {
      e.preventDefault();
      setIsNotificationsOpen((prev) => !prev);
    }
  };

  // Profil-Icon auf allen Seiten ausblenden (wird durch Dropdown ersetzt)
  const showProfileIcon = false;

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  };



  // Logout-Button auf allen Seiten ausblenden (wird durch Dropdown ersetzt)
  const showLogoutButton = false;

  return (
    <header
      className="fixed top-0 left-0 right-0 w-full bg-white z-[70] pt-safe-top"
      style={{
        height: `calc(80px + env(safe-area-inset-top, 0px))`,
        minHeight: `calc(80px + env(safe-area-inset-top, 0px))`
      }}
    >
      <div className="relative w-full h-[80px]">
        {/* Clickable area for logo sidebar - left third of header */}
        <button
          onClick={() => setIsLogoSidebarOpen(true)}
          className="absolute top-0 left-0 h-full cursor-pointer"
          style={{
            width: "33.33%",
            zIndex: 1,
          }}
          aria-label="Open menu"
        />

        <button
          id="tour-logo-menu"
          onClick={() => setIsLogoSidebarOpen(true)}
          className="absolute flex items-center justify-center md:justify-start cursor-pointer active:scale-95 transition-transform left-5 top-[18px] w-11 h-11 md:w-auto md:left-12"
          style={{
            willChange: "transform",
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
            zIndex: 2,
          }}
        >
          <picture>
            <source media="(min-width: 768px)" srcSet="/logo_font.svg" />
            <img
              src="/logo2.svg"
              alt="Logo"
              style={{
                height: "80px",
                width: "auto",
                objectFit: "contain",
                display: "block",
                willChange: "transform",
                transform: "translateZ(0)",
                backfaceVisibility: "hidden"
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const fallback = document.createElement("span");
                fallback.className = "text-xl font-bold text-black";
                fallback.innerText = "HelloUni";
                target.replaceWith(fallback);
              }}
            />
          </picture>
        </button>
        {pathname !== "/profile" &&
          !pathname.startsWith("/profile/") &&
          pathname !== "/create" && (
            <h1
              className="absolute font-bold"
              style={{
                position: "absolute",
                left: "50%",
                top: "40px", /* Vertikal zentriert mit Logo/Profilbild (18px + 44px/2 = 40px) */
                transform: "translate(-50%, -50%)",
                fontSize: "24px",
                lineHeight: "1",
                textAlign: "center",
                color: "#000000",
                whiteSpace: "nowrap"
              }}
            >
              {title ? title :
                pathname === "/home" ? "Posts" :
                  pathname === "/search" ? "Suche" :
                    (pathname === "/chat" || pathname.startsWith("/chat/")) ? "Chats" :
                      "HelloUni"}
            </h1>
          )}

        {/* Logout-Button - oben rechts */}
        {showLogoutButton && (
          <button
            onClick={handleLogout}
            className="absolute flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 touch-manipulation"
            style={{
              right: "28px",
              top: "30px",
              width: "44px",
              height: "44px",
              minWidth: "44px",
              minHeight: "44px",
              opacity: isPending ? 0.5 : 1,
              transition: "opacity 0.2s"
            }}
            onMouseEnter={() => setIsLogoutHovered(true)}
            onMouseLeave={() => setIsLogoutHovered(false)}
            title="Abmelden"
            disabled={isPending}
          >
            <LogOut
              className="transition-colors"
              style={{
                width: "32px",
                height: "32px",
                color: isLogoutHovered ? "#000000" : "rgba(0, 0, 0, 0.7)"
              }}
            />
          </button>
        )}

        {showProfileIcon && (
          <Link
            href="/profile"
            className="absolute flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 touch-manipulation"
            style={{ right: "28px", top: "30px", width: "44px", height: "44px", minWidth: "44px", minHeight: "44px" }}
            onMouseEnter={() => setIsProfileHovered(true)}
            onMouseLeave={() => setIsProfileHovered(false)}
          >
            <User
              className="transition-colors"
              style={{
                width: "40px",
                height: "40px",
                color: isProfileHovered ? "var(--color-text-beige-light)" : "var(--color-text-beige)"
              }}
            />
          </Link>
        )}

        {/* Edit Button - nur auf eigener Profilseite */}
        {pathname === "/profile" && onEditClick && (
          <button
            onClick={onEditClick}
            className="absolute flex items-center justify-center transition-opacity hover:opacity-70 cursor-pointer"
            style={{
              right: "80px",
              top: "30px",
              padding: "6px 24px",
              backgroundColor: "#000000",
              borderRadius: "20px",
              willChange: "opacity",
              transform: "translateZ(0)",
              backfaceVisibility: "hidden",
            }}
          >
            <span className="text-sm font-medium text-white">Edit</span>
          </button>
        )}



        {/* Benachrichtigungs-Icon - links neben dem Avatar (Desktop & Mobile) */}
        {onMenuClick && (
          <Link
            id="tour-nav-notifications"
            href="/notifications"
            onClick={handleBellClick}
            prefetch={true}
            aria-label="Benachrichtigungen"
            className="bell-button absolute flex items-center justify-center transition-transform hover:scale-105 active:scale-95 right-[76px] top-[18px] w-11 h-11 md:right-[104px]"
            style={{
              willChange: "transform",
              transform: "translateZ(0)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <Bell
              style={{
                width: "28px",
                height: "28px",
                color: "#000000",
                fill: pathname === "/notifications" || isNotificationsOpen ? "#000000" : "none",
              }}
            />
            {unreadNotificationCount > 0 && (
              <div className="absolute top-2 right-2 w-3 h-3 bg-[#f78d57] rounded-full border border-white" />
            )}
          </Link>
        )}

        {/* Notifications Popup */}
        {isNotificationsOpen && currentUser && (
          <div className="notifications-popup hidden md:flex absolute right-5 md:right-[104px] top-[70px] w-[380px] max-w-[calc(100vw-40px)] bg-white border border-gray-200 rounded-2xl shadow-2xl z-[80] flex-col">
            {/* Header of popup */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
              <span className="font-bold text-gray-900 text-sm">Benachrichtigungen</span>
              <div className="flex items-center gap-2">
                <NotificationSettingsMenu userId={currentUser._id} />

              </div>
            </div>
            {/* Scrollable feed list */}
            <div
              className="overflow-y-auto flex-1 relative bg-white min-h-[150px] max-h-[400px] rounded-b-2xl"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (!target.closest("button")) {
                  setIsNotificationsOpen(false);
                }
              }}
            >
              <NotificationFeed userId={currentUser._id} />
            </div>
          </div>
        )}

        {/* Mobile Menu Button - Profilbild oben rechts */}
        {onMenuClick && (
          <button
            id="tour-profile-menu"
            onClick={onMenuClick}
            className="absolute flex items-center justify-center transition-transform hover:scale-105 active:scale-95 right-5 top-[18px] md:right-12"
            style={{
              willChange: "transform",
              transform: "translateZ(0)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
            aria-label="Menü öffnen"
          >
            {/* Feste Größe für Layout-Stabilität (kein Layout Shift) - 44x44px */}
            <div className="relative w-11 h-11 rounded-full border-2 border-gray-200 shadow-sm overflow-hidden flex items-center justify-center">
              {/* Zustand 1: User lädt noch → Grauer pulsierender Platzhalter */}
              {currentUser === undefined ? (
                <div className="w-full h-full rounded-full bg-gray-200 animate-pulse" />
              ) : currentUser?.image ? (
                /* Zustand 3: User geladen UND hat Bild → Zeige Profilbild */
                <>
                  {/* Shimmer während Bild lädt */}
                  {!imageLoaded && (
                    <div className="absolute inset-0 rounded-full bg-gray-200 animate-pulse z-10" />
                  )}
                  <Image
                    src={currentUser.image}
                    alt={currentUser.name || "Benutzer"}
                    width={44}
                    height={44}
                    quality={90}
                    className="object-cover rounded-full"
                    style={{
                      position: 'relative',
                      zIndex: 20,
                    }}
                    onLoad={() => {
                      if (currentUser.image) {
                        globalLoadedImagesCache.add(currentUser.image);
                      }
                      setImageLoaded(true);
                    }}
                  />
                </>
              ) : (
                /* Zustand 2: User geladen aber KEIN Bild → Fallback-Icon */
                <div
                  className="w-full h-full flex items-center justify-center bg-gray-200"
                >
                  <User className="w-6 h-6 text-gray-500" />
                </div>
              )}
            </div>
          </button>
        )}
      </div>
      <LogoSidebar isOpen={isLogoSidebarOpen} onClose={() => setIsLogoSidebarOpen(false)} />
    </header>
  );
}

