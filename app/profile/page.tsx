"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ProfileHeader } from "@/components/profile-header";
import { FeedCard } from "@/components/feed-card";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";

export default function ProfilePage() {
    const currentUser = useQuery(api.queries.getCurrentUser);
    // Load all posts - this should be cached from the home page
    const allPosts = useQuery(api.queries.getFeed);

    // Filter posts by current user
    const userPosts = currentUser
        ? allPosts?.filter(post => post.userId === currentUser._id) || []
        : [];

    return (
        <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden">
            <Header />
            {currentUser ? (
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
                                <FeedCard key={post._id} post={post} />
                            ))
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-[#F4CFAB] py-16">
                    {allPosts === undefined ? "Lädt..." : "No user found"}
                </div>
            )}
            <BottomNavigation />
        </main>
    );
}
