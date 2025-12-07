"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { LoadingScreen } from "@/components/ui/spinner";

export default function SearchPage() {
    const [isFirstVisit, setIsFirstVisit] = useState(true);

    useEffect(() => {
        // Prüfe, ob Seite bereits besucht wurde
        const visited = sessionStorage.getItem("search_visited");
        if (visited) {
            setIsFirstVisit(false);
        } else {
            // Markiere Seite als besucht nach kurzer Verzögerung
            const timer = setTimeout(() => {
                sessionStorage.setItem("search_visited", "true");
                setIsFirstVisit(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, []);

    return (
        <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden">
            <Header />
            {isFirstVisit ? (
                <LoadingScreen text="Seite wird geladen..." />
            ) : (
                <div className="flex items-center justify-center py-16">
                    <h1 className="text-2xl" style={{ color: "var(--color-text-beige-light)" }}>
                        Search Page
                    </h1>
                </div>
            )}
            <BottomNavigation />
        </main>
    );
}
