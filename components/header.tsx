"use client";

import { User, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LogoSidebar } from "@/components/logo-sidebar";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

interface HeaderProps {
  onMenuClick?: () => void;
  onEditClick?: () => void;
}

export function Header({ onMenuClick, onEditClick }: HeaderProps = {}) {
  const [isProfileHovered, setIsProfileHovered] = useState(false);
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  const [isLogoSidebarOpen, setIsLogoSidebarOpen] = useState(false);
  const { data: session, status } = useSession();
  const pathname = usePathname();

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
        height: `calc(94px + env(safe-area-inset-top, 0px))`,
        minHeight: `calc(94px + env(safe-area-inset-top, 0px))`
      }}
    >
      <div className="relative w-full h-[94px]">
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

        {/* Logo button - visual element */}
        <button
          onClick={() => setIsLogoSidebarOpen(true)}
          className="absolute flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-transform"
          style={{
            top: "-15px",
            width: "120px",
            height: "130px",
            willChange: "transform",
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
            zIndex: 2,
          }}
        >
          <img
            src="/logo2.svg"
            alt="Logo"
            width={50}
            height={50}
            style={{
              width: "50px",
              height: "50px",
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
                target.parentElement.innerHTML = '<span class="text-2xl font-bold" style="color: #000000">C</span>';
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
                width: "100%",
                height: "30px",
                left: "50%",
                top: "50px",
                transform: "translateX(-50%)",
                fontSize: "30px",
                lineHeight: "24px",
                textAlign: "center",
                color: "#000000"
              }}
            >
              {pathname === "/home" ? "Posts" :
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



        {/* Mobile Menu Button - oben rechts */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="absolute flex items-center justify-center w-12 h-12 transition-opacity hover:opacity-70"
            style={{
              right: "20px",
              top: "20px",
              willChange: "opacity",
              transform: "translateZ(0)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <Menu
              className="w-9 h-9"
              style={{
                color: "#000000",
                fill: "none",
                stroke: "#000000",
                strokeWidth: 2,
                strokeLinecap: "round",
                strokeLinejoin: "round",
                willChange: "auto",
                transform: "translateZ(0)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                imageRendering: "crisp-edges",
                WebkitFontSmoothing: "antialiased",
              }}
            />
          </button>
        )}
      </div>
      <LogoSidebar isOpen={isLogoSidebarOpen} onClose={() => setIsLogoSidebarOpen(false)} />
    </header>
  );
}

