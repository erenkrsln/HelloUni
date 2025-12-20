"use client";

import { signOut } from "next-auth/react";
import { X, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const router = useRouter();
  const { currentUser } = useCurrentUser();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  // Body-Lock: Verhindere Scrollen des Body, wenn Sidebar offen ist
  useEffect(() => {
    if (isOpen) {
      // Speichere den aktuellen Scroll-Offset
      const scrollY = window.scrollY;
      // Setze overflow hidden auf body
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";

      return () => {
        // Stelle den Scroll-Offset wieder her
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  return (
    <>
      {/* Overlay - Full-bleed, erstreckt sich über Status Bar und Home Indicator */}
      {isOpen && (
        <div
          className="fixed bg-black/50 z-[55] transition-opacity"
          onClick={onClose}
          style={{
            position: "fixed",
            top: `calc(-1 * env(safe-area-inset-top, 0px))`, // Erstreckt sich über Status Bar hinaus
            left: 0,
            right: 0,
            bottom: `calc(-1 * env(safe-area-inset-bottom, 0px))`, // Erstreckt sich über Home Indicator hinaus
            height: `calc(100dvh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))`, // Volle Höhe + beide Safe Areas
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? "auto" : "none"
          }}
        />
      )}

      {/* Sidebar Container - Erstreckt sich über Status Bar */}
      <div
        className="fixed right-0 w-80 bg-white z-[60] shadow-2xl transition-transform duration-300 ease-in-out"
        style={{
          position: "fixed",
          top: `calc(-1 * env(safe-area-inset-top, 0px))`, // Erstreckt sich über Status Bar hinaus
          right: 0,
          bottom: `calc(-1 * env(safe-area-inset-bottom, 0px))`, // Erstreckt sich über Home Indicator hinaus
          left: "auto",
          width: "20rem", // w-80 = 320px
          height: `calc(100dvh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))`, // Volle Höhe + beide Safe Areas
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        {/* Innerer Content-Wrapper mit Safe Area Padding */}
        <div
          className="flex flex-col h-full overflow-y-auto pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))]"
          style={{
            // Smooth Scrolling für iOS
            WebkitOverflowScrolling: "touch",
            overflowY: "auto",
          }}
        >
          {/* Header mit Avatar, Name und Benutzername */}
          <div className="flex items-center justify-between pb-6 border-b border-gray-200 mb-6">
            <div className="flex items-center gap-4 flex-1">
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage src={currentUser?.image} alt={currentUser?.name || "User"} />
                <AvatarFallback className="text-lg text-black" style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}>
                  {currentUser?.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-black truncate">
                  {currentUser?.name || "Benutzer"}
                </h2>
                {currentUser?.username && (
                  <p className="text-sm text-gray-600 truncate">
                    @{currentUser.username}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors ml-2 flex-shrink-0"
              aria-label="Sidebar schließen"
            >
              <X className="w-6 h-6 text-black" />
            </button>
          </div>

          {/* Content mit Profil und Abmelde-Button - Scrollbar Bereich */}
          <div className="flex-1 flex flex-col gap-2">
            <button
              onClick={() => {
                router.push("/profile");
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-black text-left"
            >
              <User className="w-5 h-5 text-black flex-shrink-0" />
              <span>Profil</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors text-red-600 text-left"
            >
              <LogOut className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>Abmelden</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

