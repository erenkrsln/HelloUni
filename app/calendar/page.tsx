"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { LoadingScreen } from "@/components/ui/spinner";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export default function CalendarPage() {
    const [isFirstVisit, setIsFirstVisit] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    // Lade Daten im Hintergrund, damit sie beim Navigieren zu /profile bereits im Cache sind
    const { currentUser, currentUserId } = useCurrentUser();
    const posts = useQuery(
      api.queries.getFeed,
      currentUserId ? { userId: currentUserId } : {}
    );

    useEffect(() => {
        // Prüfe, ob Seite bereits besucht wurde
        const visited = sessionStorage.getItem("calendar_visited");
        if (visited) {
            setIsFirstVisit(false);
        } else {
            // Markiere Seite als besucht nach kurzer Verzögerung
            const timer = setTimeout(() => {
                sessionStorage.setItem("calendar_visited", "true");
                setIsFirstVisit(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, []);

    return (
        <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden header-spacing">
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
            {/* Mobile Sidebar */}
            <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            {isFirstVisit ? (
                <LoadingScreen text="Seite wird geladen..." />
            ) : (
                <div className="flex items-center justify-center py-16">
                    <h1 className="text-2xl" style={{ color: "#000000" }}>
                        Calendar Page
                    </h1>
                </div>
            )}
            <BottomNavigation />
        </main>
    );
}
