"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ProfileHeader } from "@/components/profile-header";
import { FeedCard } from "@/components/feed-card";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { LoadingScreen } from "@/components/ui/spinner";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useState, useEffect } from "react";

export default function ProfilePage() {
    const { currentUser, currentUserId } = useCurrentUser();
    const allPosts = useQuery(api.queries.getFeed);
    const [isFirstVisit, setIsFirstVisit] = useState(true);

    // Prüfe, ob Seite bereits besucht wurde
    useEffect(() => {
        const visited = sessionStorage.getItem("profile_visited");
        if (visited) {
            setIsFirstVisit(false);
        } else {
            // Markiere Seite als besucht nach kurzer Verzögerung
            const timer = setTimeout(() => {
                sessionStorage.setItem("profile_visited", "true");
                setIsFirstVisit(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, []);

    // Filter posts by current user
    const userPosts = currentUser
        ? allPosts?.filter(post => post.userId === currentUser._id) || []
        : [];

    // Zeige Loading nur beim ersten Besuch, sonst warte auf gecachte Daten
    // Aber warte auch beim zweiten Besuch, bis currentUser geladen ist (verhindert "No user found" Flash)
    const isLoading = isFirstVisit && (currentUser === undefined || allPosts === undefined);
    const isWaitingForUser = !isFirstVisit && currentUser === undefined && currentUserId !== undefined;

    return (
        <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden">
            <Header />
            {isLoading || isWaitingForUser ? (
                <LoadingScreen text="Profil wird geladen..." />
            ) : currentUser ? (
                <>
                    <ProfileHeader
                        name={currentUser.name}
                        image={currentUser.image}
                        uniName={currentUser.uni_name}
                        major={currentUser.major}
                    />
                    <div className="px-4 space-y-6">
                        <h3 className="text-lg font-semibold text-[#F4CFAB] mb-4 border-b border-[#F4CFAB]/20 pb-2">My Posts</h3>
                        {allPosts === undefined ? (
                            <p className="text-center text-[#F4CFAB]/60 py-8">Lädt...</p>
                        ) : userPosts.length === 0 ? (
                            <p className="text-center text-[#F4CFAB]/60 py-8">No posts yet.</p>
                        ) : (
                            userPosts.map((post) => (
                                <FeedCard 
                                    key={post._id} 
                                    post={post} 
                                    currentUserId={currentUserId}
                                />
                            ))
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-[#F4CFAB] py-16">
                    {currentUserId === undefined ? "Bitte einloggen" : "No user found"}
                </div>
            )}
            <BottomNavigation />
        </main>
    );
}
