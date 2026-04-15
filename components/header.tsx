"use client";

import { User, LogOut } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { LogoSidebar } from "@/components/logo-sidebar";
import Image from "next/image";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { globalLoadedImagesCache } from "@/lib/cache/imageCache";

interface HeaderProps {
  onMenuClick?: () => void;
  onEditClick?: () => void;
  title?: string;
}

export function Header({ onMenuClick, onEditClick, title }: HeaderProps = {}) {
  const [isProfileHovered, setIsProfileHovered] = useState(false);
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  const [isLogoSidebarOpen, setIsLogoSidebarOpen] = useState(false);
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();
  
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

  // Profil-Icon auf allen Seiten ausblenden (wird durch Dropdown ersetzt)
  const showProfileIcon = false;

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
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

        {/* Logo button - visual element (gleiche Größe wie Profilbild: 44x44px) */}
        <button
          onClick={() => setIsLogoSidebarOpen(true)}
          className="absolute flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          style={{
            left: "20px",
            top: "18px",
            width: "44px",
            height: "44px",
            willChange: "transform",
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
            zIndex: 2,
          }}
        >
          <img
            src="/logo2.svg"
            alt="Logo"
            width={44}
            height={44}
            style={{
              width: "44px",
              height: "44px",
              objectFit: "contain",
              display: "block",
              willChange: "transform",
              transform: "translateZ(0)",
              backfaceVisibility: "hidden"
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              if (target.parentElement) {
                target.parentElement.innerHTML = '<span class="text-xl font-bold" style="color: #000000">H</span>';
              }
            }}
          />
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
                    pathname === "/chat" ? "Chats" :
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
              opacity: status === "loading" ? 0.5 : 1,
              transition: "opacity 0.2s"
            }}
            onMouseEnter={() => setIsLogoutHovered(true)}
            onMouseLeave={() => setIsLogoutHovered(false)}
            title="Abmelden"
            disabled={status === "loading"}
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



        {/* Mobile Menu Button - Profilbild oben rechts */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="absolute flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            style={{
              right: "20px",
              top: "18px",
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
                    className="object-cover rounded-full transition-opacity duration-300"
                    style={{
                      opacity: imageLoaded ? 1 : 0,
                      position: 'relative',
                      zIndex: imageLoaded ? 20 : 0,
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

