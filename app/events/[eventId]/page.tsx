"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { FeedCard } from "@/components/feed-card";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { BottomNavigation } from "@/components/bottom-navigation";

import { use, Suspense, useEffect } from "react";

import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useCachedPost } from "@/lib/hooks/useCachedPost";

function EventPageContent({ params }: { params: Promise<{ eventId: string }> }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { eventId } = use(params);
    const { currentUserId } = useCurrentUser();
    const markAsRead = useMutation(api.notifications.markAsRead);

    const commentId = searchParams.get("commentId");
    const notiId = searchParams.get("notiId");

    // Mark as read if notiId is present
    useEffect(() => {
        if (notiId && currentUserId) {
            markAsRead({
                notificationId: notiId as Id<"notifications">,
                userId: currentUserId,
            }).catch(err => console.error("Failed to mark notification as read:", err));
        }
    }, [notiId, currentUserId, markAsRead]);

    const { post: event, isLoading, notFound } = useCachedPost({
        postId: eventId as Id<"posts">,
        currentUserId: currentUserId ?? undefined
    });

    return (
        <main className="min-h-screen w-full max-w-3xl mx-auto pb-24 overflow-x-hidden bg-background">
            {/* Minimal Header with Back Button */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border pt-safe-top">
                <div className="relative px-4 h-14 flex items-center justify-center">
                    <button
                        onClick={() => router.back()}
                        className="absolute left-4 p-1 text-foreground hover:opacity-70 transition-opacity"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-lg font-bold text-foreground tracking-tight">Beitrag</h1>
                </div>
            </header>

            <div className="flex-1">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : notFound ? (
                    <div className="flex flex-col items-center justify-center p-8">
                        <p className="text-muted-foreground text-lg mb-4">Event nicht gefunden</p>
                        <button
                            onClick={() => router.back()}
                            className="text-blue-500 font-medium hover:underline"
                        >
                            Zurück
                        </button>
                    </div>
                ) : (
                    <FeedCard
                        post={event}
                        currentUserId={currentUserId}
                        autoOpenCommentId={commentId || undefined}
                    />
                )}
            </div>

            <BottomNavigation />
        </main>
    );
}

export default function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
    return (
        <Suspense fallback={
            <main className="min-h-screen w-full max-w-3xl mx-auto pb-24 overflow-x-hidden bg-background">
                <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border pt-safe-top">
                    <div className="relative px-4 h-14 flex items-center justify-center">
                        <div className="absolute left-4 p-1 text-foreground opacity-30">
                            <ArrowLeft className="w-6 h-6" />
                        </div>
                        <h1 className="text-lg font-bold text-foreground tracking-tight">Beitrag</h1>
                    </div>
                </header>
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
                <BottomNavigation />
            </main>
        }>
            <EventPageContent params={params} />
        </Suspense>
    );
}
