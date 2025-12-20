"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { ProfileHeader } from "@/components/profile-header";
import { FeedCard } from "@/components/feed-card";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { LoadingScreen, Spinner } from "@/components/ui/spinner";
import { EditProfileModal } from "@/components/edit-profile-modal";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useFullUserProfile } from "@/lib/hooks/useFullUserProfile";
import { profileCache } from "@/lib/cache/profileCache";
import { Viewport } from "next";

export const viewport: Viewport = {
    themeColor: "#0a0a0a",
    viewportFit: "cover",
};


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
                    currentHeaderImage={(profileData.user as any).headerImage}
                    currentBio={(profileData.user as any).bio}
                    currentMajor={profileData.user.major}
                    currentSemester={(profileData.user as any).semester}
                    onUpdate={handleProfileUpdate}
                />
            )}
            {isLoading ? (
                <LoadingScreen text="Profil wird geladen..." />
            ) : profileData ? (
                <>
                    <ProfileHeader
                        name={profileData.user.name}
                        username={profileData.user.username}
                        image={profileData.user.image}
                        headerImage={(profileData.user as any).headerImage}
                        major={profileData.user.major}
                        semester={(profileData.user as any).semester}
                        bio={profileData.user.bio}
                        createdAt={(profileData.user as any).createdAt}
                        userId={profileData.user._id}
                        currentUserId={currentUserId}
                        isOwnProfile={true}
                        postsCount={userPosts.length}
                        followerCount={profileData.followerCount}
                        followingCount={profileData.followingCount}
                        onHeaderImageUpdate={handleProfileUpdate}
                        onEditClick={() => setIsEditModalOpen(true)}
                    />

                    {/* Posts section */}
                    <div data-posts-section>
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
