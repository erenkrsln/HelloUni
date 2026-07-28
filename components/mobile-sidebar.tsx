"use client";

import { X, LogOut, User, Map, Download, Info, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { markImageAsLoaded } from "@/lib/cache/imageCache";
import { authClient } from "@/lib/auth-client";
import { startAppTour } from "@/lib/tour";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const router = useRouter();
  const { currentUser } = useCurrentUser();

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  };

  // Markiere das Profilbild im Cache, sobald es geladen ist
  useEffect(() => {
    if (currentUser?.image) {
      markImageAsLoaded(currentUser.image);
    }
  }, [currentUser?.image]);

  // Body-Lock: Verhindere Scrollen des Body, wenn Sidebar offen ist
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  return (
    <>
      {/* Overlay - Full-bleed */}
      {isOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-black/50 z-[75] transition-opacity"
          onClick={onClose}
          style={{
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? "auto" : "none"
          }}
        />
      )}

      {/* Sidebar Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Benutzermenü"
        className="fixed top-0 right-0 bottom-0 w-80 bg-background z-[80] shadow-2xl transition-transform duration-300 ease-in-out"
        style={{
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        {/* Innerer Content-Wrapper mit Safe Area Padding */}
        <div
          className="flex flex-col h-full overflow-y-auto"
          style={{
            paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
            paddingLeft: "calc(1rem + env(safe-area-inset-left, 0px))",
            paddingRight: "calc(1rem + env(safe-area-inset-right, 0px))",
            // Smooth Scrolling für iOS
            WebkitOverflowScrolling: "touch",
            overflowY: "auto",
          }}
        >
          {/* Header mit Avatar, Name und Benutzername */}
          <div className="flex items-center justify-between pb-6 border-b border-border mb-6">
            <div className="flex items-center gap-4 flex-1">
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage src={currentUser?.image} alt={currentUser?.name || "User"} />
                <AvatarFallback className="text-lg text-foreground" style={{ backgroundColor: "hsl(var(--muted))" }}>
                  {currentUser?.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground truncate">
                  {currentUser?.name || "Benutzer"}
                </h2>
                {currentUser?.username && (
                  <p className="text-sm text-muted-foreground truncate">
                    @{currentUser.username}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-accent transition-colors ml-2 flex-shrink-0"
              aria-label="Sidebar schließen"
            >
              <X className="w-6 h-6 text-foreground" />
            </button>
          </div>

          {/* Content mit Profil und Abmelde-Button - Scrollbar Bereich */}
          <nav className="flex-1 flex flex-col gap-2" aria-label="Benutzeroptionen">
            <button
              onClick={() => {
                router.push("/profile");
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#D08945]/10 active:bg-[#D08945]/20 focus:bg-[#D08945]/10 focus:outline-none focus:ring-2 focus:ring-[#D08945]/50 transition-colors text-foreground text-left"
            >
              <User aria-hidden="true" className="w-5 h-5 text-[#D08945] flex-shrink-0" />
              <span>Profil</span>
            </button>
            <button
              onClick={() => {
                router.push("/info");
                onClose();
              }}
              className="w-full flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-[#D08945]/10 active:bg-[#D08945]/20 focus:bg-[#D08945]/10 focus:outline-none focus:ring-2 focus:ring-[#D08945]/50 transition-colors text-foreground text-left leading-normal"
            >
              <Info aria-hidden="true" className="w-5 h-5 text-[#D08945] flex-shrink-0" />
              <div className='flex w-full flex-col items-start justify-center gap-[2px]'>
                <span>Info</span>
                <span className='text-[11px] opacity-[0.42]'>Dein Studium, Semestertermine, Mensaplan...</span>
              </div>
            </button>
            <button
              onClick={() => {
                onClose();
                setTimeout(() => {
                  startAppTour();
                }, 300);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#D08945]/10 active:bg-[#D08945]/20 focus:bg-[#D08945]/10 focus:outline-none focus:ring-2 focus:ring-[#D08945]/50 transition-colors text-foreground text-left"
            >
              <Map aria-hidden="true" className="w-5 h-5 text-[#D08945] flex-shrink-0" />
              <span>Tour starten</span>
            </button>
            <button
              onClick={() => {
                router.push("/install");
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#D08945]/10 active:bg-[#D08945]/20 focus:bg-[#D08945]/10 focus:outline-none focus:ring-2 focus:ring-[#D08945]/50 transition-colors text-foreground text-left"
            >
              <Download aria-hidden="true" className="w-5 h-5 text-[#D08945] flex-shrink-0" />
              <span>Installationsguide</span>
            </button>
            <button
              onClick={() => {
                router.push("/settings");
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#D08945]/10 active:bg-[#D08945]/20 focus:bg-[#D08945]/10 focus:outline-none focus:ring-2 focus:ring-[#D08945]/50 transition-colors text-foreground text-left"
            >
              <Settings aria-hidden="true" className="w-5 h-5 text-[#D08945] flex-shrink-0" />
              <span>Einstellungen</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 active:bg-transparent focus:bg-transparent transition-colors text-red-600 dark:text-red-400 text-left"
            >
              <LogOut aria-hidden="true" className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <span>Abmelden</span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}

