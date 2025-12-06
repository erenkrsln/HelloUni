"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FeedCard } from "@/components/feed-card";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { LoadingScreen } from "@/components/ui/spinner";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export default function CalendarPage() {
    const { currentUserId } = useCurrentUser();
    const posts = useQuery(api.queries.getFeed);

    // Filtere Posts für Calendar (hier könntest du später nach Datum filtern)
    // Für jetzt zeigen wir alle Posts, aber das erste Bild bekommt priority
    const calendarPosts = posts || [];

    return (
        <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden">
            <Header />
            <div className="px-4 mb-4">
                <h2
                    className="text-2xl font-normal"
                    style={{ color: "var(--color-text-beige-light)" }}
                >
                    Calendar
                </h2>
            </div>
            <div className="px-4">
                {!posts ? (
                    <LoadingScreen text="Kalender wird geladen..." />
                ) : calendarPosts.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-sm text-[#F4CFAB]/60">Noch keine Posts vorhanden.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {calendarPosts.map((post, index) => (
                            <FeedCard 
                                key={post._id} 
                                post={post} 
                                currentUserId={currentUserId}
                                // Erstes Bild im Viewport bekommt priority für sofortiges Laden
                                priority={index === 0 && !!post.imageUrl}
                            />
                        ))}
                    </div>
                )}
            </div>
            <BottomNavigation />
        </main>
    );
}
