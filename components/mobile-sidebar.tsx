import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { Sheet, SheetContent } from "@/components/ui/sheet";

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
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="p-0 rounded-l-[32px] border-l border-border w-[85vw] max-w-[320px] bg-white overflow-hidden flex flex-col shadow-2xl"
        style={{
          // Use inline style to ensure it reaches top (already in SheetContent but reinforcing)
          // and apply safe area height logic
          height: "100dvh",
        }}
      >
        {/* Scrollable content wrapper with safe-area padding */}
        <div
          className="flex-1 flex flex-col overflow-y-auto"
          style={{
            paddingTop: "calc(env(safe-area-inset-top, 0px))", // Just safe area, no extra padding needed as Avatar has its own margin
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
            paddingLeft: "env(safe-area-inset-left, 0px)",
            paddingRight: "env(safe-area-inset-right, 0px)",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Header Section */}
          <div className="flex items-center justify-between px-6 pt-6 pb-6 border-b border-gray-100">
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
            {/* Sheet automatically adds Close button, but we can keep layout clean */}
          </div>

          {/* Navigation Links */}
          <div className="flex-1 px-4 py-4 flex flex-col gap-1">
            <button
              onClick={() => {
                router.push("/profile");
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-black group"
            >
              <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-white flex items-center justify-center transition-colors">
                <User className="w-4 h-4 text-black" />
              </div>
              <span className="font-medium">Profil</span>
            </button>

            <div className="h-px bg-gray-100 my-2 mx-4" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors text-red-600 group"
            >
              <div className="w-8 h-8 rounded-full bg-red-50 group-hover:bg-white flex items-center justify-center transition-colors">
                <LogOut className="w-4 h-4 text-red-600" />
              </div>
              <span className="font-medium">Abmelden</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

