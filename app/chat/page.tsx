"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Lade Daten im Hintergrund, damit sie beim Navigieren zu /profile bereits im Cache sind
  const { currentUser } = useCurrentUser();
  const posts = useQuery(api.queries.getFeed);
  return (
    <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex items-center justify-center py-16">
        <h1 className="text-2xl" style={{ color: "#000000" }}>
          Chat Page
        </h1>
      </div>
      <BottomNavigation />
    </main>
  );
}
