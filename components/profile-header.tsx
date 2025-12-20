"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/follow-button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { GraduationCap, Calendar, MoreHorizontal, MessageCircle, Camera, Pencil } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useMutation } from "convex/react";
import { useRef, useState } from "react";
import { HeaderImageCropModal } from "@/components/header-image-crop-modal";

interface ProfileHeaderProps {
    name: string;
    username?: string;
    image?: string;
    headerImage?: string;
    major?: string;
    semester?: number;
    bio?: string;
    createdAt?: number;
    userId: Id<"users">;
    currentUserId?: Id<"users">;
    isOwnProfile?: boolean;
    // Optional preloaded data to prevent flickering
    postsCount?: number;
    followerCount?: number;
    followingCount?: number;
    isFollowing?: boolean;
    onHeaderImageUpdate?: () => void;
    onEditClick?: () => void;
}

export function ProfileHeader({
    name,
    username,
    image,
    headerImage,
    major,
    semester,
    bio,
    createdAt,
    userId,
    currentUserId,
    isOwnProfile = false,
    postsCount,
    followerCount: preloadedFollowerCount,
    followingCount: preloadedFollowingCount,
    isFollowing: preloadedIsFollowing,
    onHeaderImageUpdate,
    onEditClick,
}: ProfileHeaderProps) {
    const headerImageInputRef = useRef<HTMLInputElement>(null);
    const generateUploadUrl = useMutation(api.mutations.generateUploadUrl);
    const updateUser = useMutation(api.mutations.updateUser);

    // State for crop modal
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [selectedImageSrc, setSelectedImageSrc] = useState<string>("");

    const handleHeaderImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !isOwnProfile) return;

        // Create a preview URL for the crop modal
        const reader = new FileReader();
        reader.onloadend = () => {
            setSelectedImageSrc(reader.result as string);
            setIsCropModalOpen(true);
        };
        reader.readAsDataURL(file);
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        try {
            // Upload cropped image
            const uploadUrl = await generateUploadUrl();
            const result = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": "image/jpeg" },
                body: croppedBlob,
            });
            const { storageId } = await result.json();

            // Update user with new header image
            await updateUser({
                userId,
                headerImage: storageId,
            });

            // Close modal and reset
            setIsCropModalOpen(false);
            setSelectedImageSrc("");

            // Call update callback to refresh the page
            if (onHeaderImageUpdate) {
                onHeaderImageUpdate();
            }
        } catch (error) {
            console.error("Fehler beim Hochladen des Titelbilds:", error);
            alert("Fehler beim Hochladen des Titelbilds");
        } finally {
            // Reset input
            if (headerImageInputRef.current) {
                headerImageInputRef.current.value = "";
            }
        }
    };

    const handleCropCancel = () => {
        setIsCropModalOpen(false);
        setSelectedImageSrc("");
        // Reset input
        if (headerImageInputRef.current) {
            headerImageInputRef.current.value = "";
        }
    };
    // Use preloaded data if available, otherwise query
    const queriedFollowerCount = useQuery(api.queries.getFollowerCount,
        preloadedFollowerCount === undefined && userId ? { userId } : "skip"
    );
    const queriedFollowingCount = useQuery(api.queries.getFollowingCount,
        preloadedFollowingCount === undefined && userId ? { userId } : "skip"
    );

    const followerCount = preloadedFollowerCount ?? queriedFollowerCount;
    const followingCount = preloadedFollowingCount ?? queriedFollowingCount;

    // Format "Joined" date - only show if createdAt is available
    const joinedDate = createdAt
        ? format(new Date(createdAt), "MMMM yyyy", { locale: de })
        : null;

    // Format major display
    const getMajorDisplay = () => {
        if (!major) return null;
        // Extract degree type from major string (e.g., "B.Eng.", "B.Sc.", "B.A.")
        const degreeMatch = major.match(/\((B\.(?:Eng|Sc|A)\.)\)/);
        const degreeType = degreeMatch ? degreeMatch[1] : "";
        const majorName = major.replace(/\s*\(B\.(?:Eng|Sc|A)\.\)\s*$/, "").trim();

        // Convert degree type to full name
        const degreeName = degreeType === "B.Eng." ? "Bachelor" :
            degreeType === "B.Sc." ? "Bachelor" :
                degreeType === "B.A." ? "Bachelor" : "";

        if (semester) {
            return `${degreeName} ${majorName} - ${semester}. Semester`;
        }
        return `${degreeName} ${majorName}`;
    };

    const majorDisplay = getMajorDisplay();

    return (
        <div className="relative w-full">
            {/* iOS Overscroll Filler: Verhindert weißen Spalt beim Herunterziehen */}
            <div
                className="absolute top-0 left-0 right-0 h-[100vh] -translate-y-full z-0"
                style={{ backgroundColor: '#0a0a0a' }}
            />

            {/* Header Image - Twitter/X Style (3:1 aspect ratio) */}
            <div className="relative w-full bg-[#0a0a0a] overflow-hidden group" style={{ aspectRatio: '3/1', minHeight: '120px' }}>
                {headerImage ? (
                    <img
                        src={headerImage}
                        alt="Header"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#D08945]/20 to-[#DCA067]/20" />
                )}

                {/* Edit Header Image Button - only visible on own profile */}
                {isOwnProfile && (
                    <>
                        <input
                            ref={headerImageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleHeaderImageSelect}
                            className="hidden"
                            id="header-image-upload-inline"
                        />
                        <button
                            onClick={() => headerImageInputRef.current?.click()}
                            className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 active:bg-black/80 flex items-center justify-center transition-all duration-200"
                            aria-label="Titelbild ändern"
                        >
                            <Camera className="w-4 h-4 text-white" />
                        </button>
                    </>
                )}
            </div>

            {/* Profile Picture - overlapping header (Twitter/X Style) */}
            <div className="relative px-4">
                <div className="flex items-end justify-between -mt-12 sm:-mt-20 mb-2">
                    {/* Profile Picture - overlaps header by ~50%, thick white border */}
                    <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white shadow-xl" style={{ backgroundColor: 'white' }}>
                        <AvatarImage src={image} alt={name} className="object-cover" />
                        <AvatarFallback className="text-2xl sm:text-3xl bg-[#000000]/20 text-[#000000] font-semibold">
                            {name[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                    </Avatar>

                    {/* Action Buttons - right side, aligned with profile picture */}
                    {!isOwnProfile && (
                        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 -mb-2 sm:mb-0 -ml-2 sm:-ml-6">
                            <button
                                className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm flex-shrink-0"
                                aria-label="Mehr Optionen"
                            >
                                <MoreHorizontal className="w-5 h-5 text-gray-700" />
                            </button>
                            <button
                                className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm flex-shrink-0"
                                aria-label="Nachricht senden"
                            >
                                <MessageCircle className="w-5 h-5 text-gray-700" />
                            </button>
                            <FollowButton
                                currentUserId={currentUserId}
                                targetUserId={userId}
                                preloadedIsFollowing={preloadedIsFollowing}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Information */}
            <div className="px-4 pb-4 space-y-3 mt-2 sm:-mt-2">
                {/* Name and Username */}
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-lg sm:text-xl font-semibold text-[#000000] flex-1">{name}</h1>
                        {/* Edit Button - nur auf eigenem Profil */}
                        {isOwnProfile && onEditClick && (
                            <button
                                onClick={onEditClick}
                                className="px-3 py-1.5 rounded-full bg-[#D08945] text-white text-xs font-medium hover:bg-[#C07835] transition-colors flex items-center gap-1.5 flex-shrink-0"
                                aria-label="Profil bearbeiten"
                            >
                                <Pencil className="w-3 h-3" />
                                <span>Bearbeiten</span>
                            </button>
                        )}
                    </div>
                    {username && (
                        <p className="text-sm sm:text-base text-gray-500">@{username}</p>
                    )}
                </div>


                {/* Bio */}
                {bio && bio.trim() !== "" && (
                    <p className="text-sm text-[#000000] leading-relaxed">
                        {bio}
                    </p>
                )}

                {/* Academic Details */}
                <div className="space-y-2">
                    {majorDisplay && (
                        <div className="flex items-center gap-2 text-sm text-[#000000]">
                            <GraduationCap className="w-4 h-4 text-gray-600 flex-shrink-0" />
                            <span>{majorDisplay}</span>
                        </div>
                    )}
                    {joinedDate && (
                        <div className="flex items-center gap-2 text-sm text-[#000000]">
                            <Calendar className="w-4 h-4 text-gray-600 flex-shrink-0" />
                            <span>{joinedDate} beigetreten</span>
                        </div>
                    )}
                </div>

                {/* Stats - Follower, Following (Twitter/X Style) */}
                <div className="flex items-center gap-4 -mt-1">
                    {/* Follower Stat */}
                    <button
                        className="flex items-center gap-1 hover:underline transition-all text-sm text-[#000000]"
                        onClick={() => {
                            // TODO: Open followers list modal/page
                            console.log("Open followers list");
                        }}
                    >
                        <span className="font-semibold">
                            {followerCount ?? 0}
                        </span>
                        <span className="text-[#000000]/60">
                            Follower
                        </span>
                    </button>

                    {/* Following Stat */}
                    <button
                        className="flex items-center gap-1 hover:underline transition-all text-sm text-[#000000]"
                        onClick={() => {
                            // TODO: Open following list modal/page
                            console.log("Open following list");
                        }}
                    >
                        <span className="font-semibold">
                            {followingCount ?? 0}
                        </span>
                        <span className="text-[#000000]/60">
                            Following
                        </span>
                    </button>
                </div>
            </div>

            {/* Header Image Crop Modal */}
            {isCropModalOpen && selectedImageSrc && (
                <HeaderImageCropModal
                    isOpen={isCropModalOpen}
                    onClose={handleCropCancel}
                    imageSrc={selectedImageSrc}
                    onCropComplete={handleCropComplete}
                />
            )}
        </div>
    );
}
