"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { NotificationFeed } from "@/components/notification-feed";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { currentUser } = useCurrentUser();
    const router = useRouter();

    if (!currentUser) {
        return null;
    }

    return (
        <main className="min-h-screen w-full max-w-2xl mx-auto pb-24 overflow-x-hidden bg-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 h-14 flex items-center justify-center relative">
                <button
                    onClick={() => router.back()}
                    className="absolute left-4 p-1 text-black hover:opacity-70 transition-opacity"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold text-black tracking-tight">Benachrichtigungen</h1>
            </header>

            {/* Notification Feed */}
            <NotificationFeed userId={currentUser._id} />

            <BottomNavigation />
        </main>
    );
}




















