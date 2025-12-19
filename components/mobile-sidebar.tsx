"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { signOut } from "next-auth/react";
import { LogOut, User, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 ease-in-out",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-y-0 right-0 z-[60] bg-white shadow-2xl transition-transform duration-300 ease-out will-change-transform",
          // Layout Specs: YouTube Style (Mirrored)
          "w-[min(88vw,360px)] rounded-l-[28px]",
          // Animation
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{
          // Ensure full viewport height including browser chrome
          height: "100dvh",
          top: 0,
        }}
      >
        {/* 
          Content Wrapper with Safe Area logic:
          - Padding Top includes safe-area + extra spacing
          - Padding Bottom includes safe-area + extra spacing
          - Background remains full bleed white behind the notch
        */}
        <div
          className="h-full flex flex-col overflow-y-auto overscroll-contain"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 12px)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)",
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Header Section */}
          <div className="flex items-center justify-between px-6 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Avatar className="w-12 h-12 flex-shrink-0 border border-gray-100">
                <AvatarImage src={currentUser?.image} alt={currentUser?.name || "User"} />
                <AvatarFallback className="text-lg text-black bg-gray-100">
                  {currentUser?.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-black truncate leading-tight">
                  {currentUser?.name || "Benutzer"}
                </h2>
                {currentUser?.username && (
                  <p className="text-sm text-gray-500 truncate">
                    @{currentUser.username}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 px-4 py-4 flex flex-col gap-1">
            <button
              onClick={() => {
                router.push("/profile");
                onClose();
              }}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-black group"
            >
              <User className="w-6 h-6 text-black" />
              <span className="font-medium text-[15px]">Profil</span>
            </button>

            <div className="h-px bg-gray-100 my-2 mx-4" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors text-red-600 group"
            >
              <LogOut className="w-6 h-6 text-red-600" />
              <span className="font-medium text-[15px]">Abmelden</span>
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
