"use client";

import { signOut } from "next-auth/react";
import { X, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
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

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
          style={{
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? "auto" : "none"
          }}
        />
      )}

      {/* Sidebar */}
      <div
        className="fixed top-0 right-0 h-full w-80 bg-white z-50 shadow-2xl transition-transform duration-300 ease-in-out"
        style={{
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header mit Avatar, Name und Benutzername */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
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

          {/* Content mit Abmelde-Button */}
          <div className="flex-1 p-6">
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
}

