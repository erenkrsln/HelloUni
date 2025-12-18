"use client";

import { signOut } from "next-auth/react";
import { X, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  if (!mounted) return null;

  const sidebarContent = (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed bg-black/50 z-[55] transition-opacity"
          onClick={onClose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? "auto" : "none",
            zIndex: 55,
          }}
        />
      )}

      {/* Sidebar */}
      <div
        className="fixed right-0 w-80 z-[60] shadow-2xl transition-transform duration-300 ease-in-out"
        style={{
          position: "fixed",
          top: 0,
          left: "auto",
          right: 0,
          width: "20rem",
          height: "100dvh",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          zIndex: 60,
        }}
      >
        {/* Background that extends to very top */}
        <div
          className="absolute bg-white"
          style={{
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          }}
        />
        {/* Content with safe area padding */}
        <div 
          className="relative flex flex-col h-full"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {/* Header mit Avatar, Name und Benutzername */}
          <div 
            className="flex items-center justify-between p-6 border-b border-gray-200"
          >
            <div className="flex items-center gap-4 flex-1">
              <Avatar className="w-12 h-12">
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
            >
              <X className="w-6 h-6 text-black" />
            </button>
          </div>

          {/* Content mit Profil und Abmelde-Button */}
          <div 
            className="flex-1 p-6 flex flex-col gap-2"
          >
            <button
              onClick={() => {
                router.push("/profile");
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-black"
            >
              <User className="w-5 h-5 text-black" />
              <span>Profil</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors text-red-600"
            >
              <LogOut className="w-5 h-5 text-red-600" />
              <span>Abmelden</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(sidebarContent, document.body);
}

