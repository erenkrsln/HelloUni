"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { LogoSidebar } from "@/components/logo-sidebar";
import { NotificationFeed } from "@/components/notification-feed";
import { NotificationSettingsMenu } from "@/components/notification-settings-menu";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function NotificationsPage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoSidebarOpen, setIsLogoSidebarOpen] = useState(false);
    const { currentUser } = useCurrentUser();
    const router = useRouter();
    const cleanUpNotifications = useMutation(api.notifications.cleanUpGroupJoinNotifications);

    useEffect(() => {
        let isRealMount = false;
        const timer = setTimeout(() => {
            isRealMount = true;
        }, 150);

        return () => {
            clearTimeout(timer);
            if (isRealMount && currentUser) {
                cleanUpNotifications({ userId: currentUser._id }).catch((err) => {
                    console.error("Failed to clean up group join notifications:", err);
                });
            }
        };
    }, [currentUser, cleanUpNotifications]);

    if (!currentUser) {
        return null;
    }

    return (
        <main className="min-h-screen w-full max-w-3xl mx-auto pb-24 overflow-x-hidden bg-white">
            {/* Desktop: HelloUni Logo oben links */}
            <button
                onClick={() => setIsLogoSidebarOpen(true)}
                className="hidden md:flex fixed top-0 left-12 z-[70] h-20 items-center cursor-pointer active:scale-95 transition-transform"
                aria-label="Menü öffnen"
            >
                <img
                    src="/logo_font.svg"
                    alt="HelloUni"
                    style={{ height: "80px", width: "auto", objectFit: "contain", display: "block" }}
                />
            </button>
            <LogoSidebar isOpen={isLogoSidebarOpen} onClose={() => setIsLogoSidebarOpen(false)} />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 pt-safe-top">
                <div className="relative px-4 h-14 flex items-center justify-center">
                    <button
                        onClick={() => router.back()}
                        className="absolute left-4 p-1 text-black hover:opacity-70 transition-opacity"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-lg font-bold text-black tracking-tight">Benachrichtigungen</h1>
                    <div className="absolute right-4">
                        <NotificationSettingsMenu userId={currentUser._id} />
                    </div>
                </div>
            </header>

            {/* Notification Feed */}
            <NotificationFeed userId={currentUser._id} />

            <BottomNavigation />
        </main>
    );
}




















