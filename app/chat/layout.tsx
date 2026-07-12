"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatPlaceholder } from "@/components/chat-placeholder";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Header } from "@/components/header";
import { MobileSidebar } from "@/components/mobile-sidebar";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // A chat is selected if the pathname is not exactly "/chat"
  const isChatSelected = pathname !== "/chat" && pathname !== "/chat/";

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden lg:pl-[120px]">
      {/* Top Header: 
          On desktop: always visible.
          On mobile: visible only if no chat is selected (so active chat detail page is fullscreen).
      */}
      <div className={isChatSelected ? "hidden md:block" : "block"}>
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Content Area: sits below the header.
          On mobile: when no chat is selected, we add top padding to push content below the header.
          On desktop: header is always visible, so we always add top padding.
      */}
      <div
        className={`flex-1 flex overflow-hidden ${
          isChatSelected 
            ? "pt-0 md:pt-[calc(80px+env(safe-area-inset-top,0px))]" 
            : "pt-[calc(80px+env(safe-area-inset-top,0px))]"
        }`}
      >
        {/* Sidebar: 
            On mobile: hidden if a chat is selected, full screen if not.
            On desktop (md): always visible, fixed width.
        */}
        <div
          className={`h-full flex-col flex-shrink-0 md:flex md:w-[350px] lg:w-[400px] border-r border-border ${
            isChatSelected ? "hidden" : "flex w-full"
          }`}
        >
          <ChatSidebar />
        </div>

        {/* Detail Pane:
            On mobile: full screen if a chat is selected, hidden if not.
            On desktop (md): always visible, takes remaining space.
        */}
        <div
          className={`h-full flex-1 flex flex-col relative ${
            isChatSelected ? "flex w-full" : "hidden md:flex"
          }`}
        >
          {isChatSelected ? children : <ChatPlaceholder />}
        </div>
      </div>

      {/* Persistent BottomNavigation:
          On mobile: hidden when a chat is selected to avoid covering input.
          On desktop: always visible (floats vertically on the left).
      */}
      <div className={isChatSelected ? "hidden md:block" : "block"}>
        <BottomNavigation />
      </div>
    </div>
  );
}
