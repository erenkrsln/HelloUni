"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LoadingScreen } from "@/components/ui/spinner";

export default function PrivacyPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return (
            <main className="min-h-screen w-full max-w-[428px] mx-auto bg-white flex items-center justify-center">
                <LoadingScreen text="" />
            </main>
        );
    }

    return (
        <main className="min-h-screen w-full max-w-[428px] mx-auto bg-white">
            {/* Custom Header with Back Button */}
            <header
                className="fixed top-0 left-0 right-0 bg-white z-50 px-4 flex items-center"
                style={{
                    height: `calc(60px + env(safe-area-inset-top, 0px))`,
                    paddingTop: `env(safe-area-inset-top, 0px)`
                }}
            >
                <button
                    onClick={() => router.back()}
                    className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Zurück"
                >
                    <ArrowLeft className="w-6 h-6 text-black" />
                </button>
            </header>

            {/* Content with padding for header */}
            <div
                className="px-4 pb-6"
                style={{ paddingTop: `calc(80px + env(safe-area-inset-top, 0px))` }}
            >
                <h1 className="text-2xl font-bold mb-4">Datenschutz</h1>
                <p className="text-gray-600">Inhalt folgt...</p>
            </div>
        </main>
    );
}
