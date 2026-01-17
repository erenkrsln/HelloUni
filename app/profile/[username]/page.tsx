"use client";

import { useState } from "react";
import { ProfileHeader } from "@/components/profile-header";
import { FeedCard } from "@/components/feed-card";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { LoadingScreen, Spinner } from "@/components/ui/spinner";
import { EditProfileModal } from "@/components/edit-profile-modal";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useFullUserProfile } from "@/lib/hooks/useFullUserProfile";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";


/**
 * User Profile Page Component
 * 
 * Uses useFullUserProfile hook for unified caching:
 * - First visit: Shows loading spinner until ALL data loads
 * - Subsequent visits: Shows cached data IMMEDIATELY (no spinner)
 */
export default function UserProfilePage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const params = useParams();
    const username = params.username as string;
    const { currentUserId, currentUser } = useCurrentUser();

    // Use unified hook with client-side caching
    // Returns cached data immediately on subsequent visits
    const { data: profileData, isLoading, notFound } = useFullUserProfile({
        username,
        currentUserId
    });

    // Check if this is the current user's own profile
    const isOwnProfile = profileData?.user?._id === currentUserId;

    // Fetch all posts (separate query, also cached by Convex)
    const allPosts = useQuery(
      api.queries.getFeed,
      currentUserId ? { userId: currentUserId } : {}
    );

    // Filter posts by this user
    const userPosts = profileData?.user
        ? allPosts?.filter((post) => post.userId === profileData.user._id) || []
        : [];

    return (
        <main 
            className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden"
            style={{
                overscrollBehaviorY: 'none',
                minHeight: '100dvh',
            }}
        >
            {/* Mobile Sidebar */}
            <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            {isLoading ? (
                // Show spinner only on first visit (no cached data)
                <LoadingScreen text="Profil wird geladen..." />
            ) : notFound ? (
                // User not found
                <div className="flex-1 flex items-center justify-center text-[#000000] py-16">
                    Benutzer nicht gefunden
                </div>
            ) : profileData ? (
                <>
                    {/* Profile header with preloaded data from cache */}
                    <ProfileHeader
                        name={profileData.user.name}
                        username={profileData.user.username}
                        image={profileData.user.image}
                        headerImage={profileData.user.headerImage}
                        major={profileData.user.major}
                        semester={profileData.user.semester}
                        bio={profileData.user.bio}
                        createdAt={profileData.user.createdAt}
                        userId={profileData.user._id}
                        currentUserId={currentUserId}
                        isOwnProfile={isOwnProfile}
                        postsCount={userPosts.length}
                        followerCount={profileData.followerCount}
                        followingCount={profileData.followingCount}
                        isFollowing={profileData.isFollowing}
                        onEditClick={isOwnProfile ? () => setIsEditModalOpen(true) : undefined}
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
                                        isFirst={index === 0}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : null}
            
            {/* Edit Profile Modal - nur wenn es das eigene Profil ist */}
            {isOwnProfile && profileData && (
                <EditProfileModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    userId={profileData.user._id}
                    currentName={profileData.user.name}
                    currentImage={profileData.user.image}
                    currentHeaderImage={profileData.user.headerImage}
                    currentBio={profileData.user.bio}
                    currentMajor={profileData.user.major}
                    currentSemester={profileData.user.semester}
                    currentInterests={(profileData.user as any).interests}
                    onUpdate={() => {
                        // Refresh page data after update
                        window.location.reload();
                    }}
                />
            )}
            
            <BottomNavigation />
        </main>
    );
}



