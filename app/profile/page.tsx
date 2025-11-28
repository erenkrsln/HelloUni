"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ProfileHeader } from "@/components/profile-header";
import { FeedCard } from "@/components/feed-card";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";

export default function ProfilePage() {
    const user = useQuery(api.queries.getCurrentUser);
    const posts = useQuery(api.queries.getUserPosts, user ? { userId: user._id } : "skip");

    if (user === undefined) {
        return (
            <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden">
                <Header />
                <div className="pt-8 px-4 flex flex-col items-center opacity-50">
                    <div className="w-24 h-24 rounded-full bg-[#F4CFAB]/20 animate-pulse mb-4" />
                    <div className="h-6 w-32 bg-[#F4CFAB]/20 animate-pulse mb-2 rounded" />
                    <div className="h-4 w-48 bg-[#F4CFAB]/20 animate-pulse rounded" />
                </div>
                <BottomNavigation />
            </main>
        );
    }

    if (user === null) {
        return (
            <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden flex flex-col">
                <Header />
                <div className="flex-1 flex items-center justify-center text-[#F4CFAB]">
                    User not found
                </div>
                <BottomNavigation />
            </main>
        );
    }

    return (
        <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden">
            <Header />
            <ProfileHeader
                name={user.name}
                image={user.image}
                uniName={user.uni_name}
                major={user.major}
            />
            <div className="px-4 space-y-6">
                <h3 className="text-lg font-semibold text-[#F4CFAB] mb-4 border-b border-[#F4CFAB]/20 pb-2">My Posts</h3>
                {posts === undefined ? (
                    <p className="text-center text-[#F4CFAB]/60 py-8">Lädt...</p>
                ) : posts.length === 0 ? (
                    <p className="text-center text-[#F4CFAB]/60 py-8">No posts yet.</p>
                ) : (
                    posts.map((post) => (
                        <FeedCard key={post._id} post={post} />
                    ))
                )}
            </div>
            <BottomNavigation />
        </main>
    );
}
