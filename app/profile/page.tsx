"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { ProfileHeader } from "@/components/profile-header";
import { FeedCard } from "@/components/feed-card";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { LoadingScreen, Spinner } from "@/components/ui/spinner";
import { EditProfileModal } from "@/components/edit-profile-modal";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useFullUserProfile } from "@/lib/hooks/useFullUserProfile";
import { profileCache } from "@/lib/cache/profileCache";

export default function ProfilePage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const router = useRouter();
    const { currentUser, currentUserId } = useCurrentUser();
    const allPosts = useQuery(api.queries.getFeed);

    // Use unified hook for own profile as well (ensures caching works same way)
    // We pass the username from currentUser if available
    const { data: profileData, isLoading: isProfileLoading } = useFullUserProfile({
        username: currentUser?.username || "",
        currentUserId
    });

    // Only show loading if we don't have profile data yet
    // On second visit, profileData comes from cache immediately
    const isLoading = isProfileLoading && !profileData;

    // Filter posts by current user
    const userPosts = profileData?.user
        ? allPosts?.filter(post => post.userId === profileData.user._id) || []
        : [];

    const handleProfileUpdate = () => {
        // Clear cache to force refresh
        if (currentUser?.username) {
            const cacheKey = profileCache.getKey(currentUser.username, currentUserId);
            profileCache.delete(cacheKey);
        }
        router.refresh();
    };

    return (
        <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden">
            <Header
                onMenuClick={() => setIsSidebarOpen(true)}
                onEditClick={() => setIsEditModalOpen(true)}
            />
            {/* Mobile Sidebar */}
            <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Edit Profile Modal */}
            {profileData && (
                <EditProfileModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    userId={profileData.user._id}
                    currentName={profileData.user.name}
                    currentImage={profileData.user.image}
                    currentBio={(profileData.user as any).bio}
                    onUpdate={handleProfileUpdate}
                />
            )}
            {isLoading ? (
                <LoadingScreen text="Profil wird geladen..." />
            ) : profileData ? (
                <>
                    <ProfileHeader
                        name={profileData.user.name}
                        image={profileData.user.image}
                        uniName={profileData.user.uni_name}
                        major={profileData.user.major}
                        bio={profileData.user.bio}
                        userId={profileData.user._id}
                        currentUserId={currentUserId}
                        isOwnProfile={true}
                        postsCount={userPosts.length}
                        followerCount={profileData.followerCount}
                        followingCount={profileData.followingCount}
                    />



                    {/* Calendar Link - Only show on own profile */}
                    {currentUser && (
                        <div className="px-4 mb-4">
                            <button
                                onClick={() => router.push("/calendar")}
                                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[#f0f0f0] active:bg-[#e0e0e0] transition-colors"
                            >
                                <span className="text-[#000000] font-medium">Open Calendar</span>
                            </button>
                        </div>
                    )}

                    {/* Posts section */}
                    <div>
                        <h3 className="px-4 text-lg font-semibold text-[#000000] mb-4 border-b border-[#000000]/20 pb-2">
                            Posts
                        </h3>
                        {allPosts === undefined ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Spinner size="md" />
                            </div>
                        ) : userPosts.length === 0 ? (
                            <p className="text-center text-[#000000]/60 py-8">No posts yet.</p>
                        ) : (
                            <div style={{ gap: "0", margin: "0", padding: "0" }}>
                                {userPosts.map((post, index) => (
                                    <FeedCard
                                        key={post._id}
                                        post={post}
                                        currentUserId={currentUserId}
                                        showDivider={index < userPosts.length - 1}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : null}
            <BottomNavigation />
        </main>
    );
}
