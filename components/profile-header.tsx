"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/follow-button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { GraduationCap, Calendar, MoreHorizontal, MessageCircle, Camera, Pencil, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useMutation } from "convex/react";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { HeaderImageCropModal } from "@/components/header-image-crop-modal";

// Importiere den gemeinsamen globalen Bild-Cache
import { globalLoadedImagesCache, isImageLoaded, markImageAsLoaded } from "@/lib/cache/imageCache";

interface ProfileHeaderProps {
    name: string;
    username?: string;
    image?: string;
    headerImage?: string;
    headerColor?: string; // Hintergrundfarbe für Header (Twitter-ähnlich)
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
    headerColor,
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
    const router = useRouter();
    // State für Avatar-Ladezustand - zeige Bild sofort an wenn URL vorhanden
    const [isAvatarLoaded, setIsAvatarLoaded] = useState(() => {
        // Zeige Bild sofort an, wenn URL vorhanden ist
        // Das Fade-In ist nur für Bilder nützlich, die bereits im Cache sind
        return image ? true : false;
    });
    // State für sanftes Fade-In des Header-Bildes - zeige Bild sofort an wenn URL vorhanden
    const [isHeaderImageLoaded, setIsHeaderImageLoaded] = useState(() => {
        // Zeige Bild sofort an, wenn URL vorhanden ist
        return headerImage ? true : false;
    });
    // Extrahiere dominante Farbe aus dem Bild für Hintergrund
    const [extractedColor, setExtractedColor] = useState<string | null>(null);
    const headerImageInputRef = useRef<HTMLInputElement>(null);

    // Reset Avatar loaded state wenn image sich ändert
    useEffect(() => {
        // Zeige Bild sofort an, wenn neue URL vorhanden ist
        setIsAvatarLoaded(image ? true : false);
    }, [image]);

    // Reset loaded state wenn headerImage sich ändert
    useEffect(() => {
        // Zeige Bild sofort an, wenn neue URL vorhanden ist
        setIsHeaderImageLoaded(headerImage ? true : false);
        setExtractedColor(null);
    }, [headerImage]);

    // Extrahiere dominante Farbe aus dem Header-Bild für besseren Hintergrund
    useEffect(() => {
        if (!headerImage) return;

        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                canvas.width = 50; // Kleine Auflösung für Performance
                canvas.height = 50;
                ctx.drawImage(img, 0, 0, 50, 50);

                // Extrahiere dominante Farbe aus der Mitte des Bildes
                const imageData = ctx.getImageData(20, 15, 10, 10);
                const data = imageData.data;

                let r = 0, g = 0, b = 0;
                for (let i = 0; i < data.length; i += 4) {
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                }
                const pixelCount = data.length / 4;
                r = Math.floor(r / pixelCount);
                g = Math.floor(g / pixelCount);
                b = Math.floor(b / pixelCount);

                // Konvertiere zu Hex
                const hex = `#${[r, g, b].map(x => {
                    const hex = x.toString(16);
                    return hex.length === 1 ? '0' + hex : hex;
                }).join('')}`;

                setExtractedColor(hex);
            } catch (e) {
                // Bei Fehler (z.B. CORS) verwende Fallback
                console.warn('Could not extract color from header image:', e);
            }
        };
        img.onerror = () => {
            // Bei Fehler verwende Fallback
        };
        img.src = headerImage;
    }, [headerImage]);
    const generateUploadUrl = useMutation(api.mutations.generateUploadUrl);
    const updateUser = useMutation(api.mutations.updateUser);
    const createConversation = useMutation(api.mutations.createConversation);

    // Get conversations to check if a direct message already exists
    const conversations = useQuery(
        api.queries.getConversations,
        currentUserId ? { userId: currentUserId } : "skip"
    );

    // State for crop modal
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [selectedImageSrc, setSelectedImageSrc] = useState<string>("");
    const [isUploading, setIsUploading] = useState(false);

    const handleHeaderImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !isOwnProfile) return;

        // Create a preview URL for the crop modal
        const reader = new FileReader();
        reader.onloadend = () => {
            setSelectedImageSrc(reader.result as string);
            setIsCropModalOpen(true);
        };
        reader.onerror = () => {
            alert("Fehler beim Lesen der Datei");
        };
        reader.readAsDataURL(file);
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        setIsUploading(true);
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
            setIsUploading(false);
            // Reset input
            if (headerImageInputRef.current) {
                headerImageInputRef.current.value = "";
            }
        }
    };

    const handleCropCancel = () => {
        if (isUploading) return; // Prevent closing during upload
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
        <div
            className="relative w-full sticky top-0 z-40 profile-header-sticky bg-white"
            style={{
                overscrollBehavior: 'none',
            }}
        >
            {/* Header Image - Twitter/X Style (3:1 aspect ratio) - Full width on mobile, limited on desktop */}
            <div
                className={`relative overflow-hidden group header-image-responsive aspect-[3/1] ${!headerColor && !extractedColor ? 'bg-gradient-to-br from-[#D08945]/20 to-[#DCA067]/20' : ''
                    }`}
                style={{
                    backgroundColor: headerColor || extractedColor || undefined, // Sofort sichtbare Hintergrundfarbe (aus Bild extrahiert oder Gradient-Fallback)
                    minHeight: '120px',
                    transition: extractedColor ? 'background-color 0.3s ease-in-out' : undefined, // Sanfter Übergang wenn Farbe extrahiert wird
                }}
            >
                {/* Back Arrow Button - bottom left on mobile, top left on desktop with iOS safe area */}
                <button
                    onClick={() => router.back()}
                    className="absolute bottom-12 left-3 sm:bottom-auto sm:left-3 profile-header-button w-[31px] h-[31px] sm:w-8 sm:h-8 rounded-full bg-black/50 hover:bg-black/70 active:bg-black/80 flex items-center justify-center transition-all duration-200 shadow-lg z-50 cursor-pointer"
                    aria-label="Zurück"
                >
                    <ArrowLeft className="w-[15px] h-[15px] sm:w-4 sm:h-4 text-white" />
                </button>

                {headerImage ? (
                    <>
                        {/* Header Bild mit priority und sanftem Fade-In */}
                        <Image
                            src={headerImage}
                            alt="Header"
                            fill
                            sizes="(max-width: 639px) 100vw, 428px"
                            priority
                            className="object-cover transition-opacity duration-300"
                            style={{
                                opacity: isHeaderImageLoaded ? 1 : 0,
                            }}
                            onLoad={() => {
                                markImageAsLoaded(headerImage);
                                setIsHeaderImageLoaded(true);
                            }}
                        />
                    </>
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#D08945]/20 to-[#DCA067]/20" />
                )}
            </div>

            {/* Profile Picture - overlapping header (Twitter/X Style) */}
            <div className="relative px-4 z-10">
                <div className="flex items-end justify-between -mt-12 sm:-mt-20 mb-2">
                    {/* Profile Picture - overlaps header by ~50%, thick white border */}
                    <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white flex items-center justify-center">
                        {image ? (
                            <>
                                {/* Shimmer während des Ladens */}
                                {!isAvatarLoaded && (
                                    <div className="absolute inset-0 rounded-full shimmer-animation z-10" />
                                )}
                                {/* Profilbild mit priority für sofortiges Laden */}
                                <Image
                                    src={image}
                                    alt={name}
                                    width={128}
                                    height={128}
                                    quality={90}
                                    priority
                                    className="object-cover rounded-full"
                                    style={{
                                        position: 'relative',
                                        zIndex: 20,
                                    }}
                                    onLoad={() => {
                                        markImageAsLoaded(image);
                                        setIsAvatarLoaded(true);
                                    }}
                                    onError={() => {
                                        setIsAvatarLoaded(false);
                                    }}
                                />
                            </>
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center font-semibold text-black text-2xl sm:text-3xl"
                                style={{
                                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                                }}
                            >
                                {name[0]?.toUpperCase() || "U"}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons - right side, aligned with profile picture */}
                    {!isOwnProfile && (
                        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 -mb-2 sm:mb-0 -ml-2 sm:-ml-6" style={{ marginLeft: "-2px" }}>
                            <button
                                className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm flex-shrink-0"
                                style={{ flexShrink: 0 }}
                                aria-label="Mehr Optionen"
                            >
                                <MoreHorizontal className="w-5 h-5 text-gray-700" />
                            </button>
                            <button
                                onClick={async () => {
                                    if (!currentUserId || !userId) return;

                                    // Check if a direct message conversation already exists
                                    const existingConversation = conversations?.find(conv => {
                                        // Direct message: exactly 2 participants and not a group
                                        return !conv.isGroup &&
                                            conv.participants.length === 2 &&
                                            conv.participants.includes(currentUserId) &&
                                            conv.participants.includes(userId);
                                    });

                                    if (existingConversation) {
                                        // Navigate to existing conversation
                                        router.push(`/chat/${existingConversation._id}`);
                                    } else {
                                        // Create new direct message conversation
                                        try {
                                            const conversationId = await createConversation({
                                                participants: [currentUserId, userId],
                                            });
                                            router.push(`/chat/${conversationId}`);
                                        } catch (error) {
                                            console.error("Failed to create conversation:", error);
                                        }
                                    }
                                }}
                                className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm flex-shrink-0"
                                style={{ flexShrink: 0 }}
                                aria-label="Nachricht senden"
                            >
                                <MessageCircle className="w-5 h-5 text-gray-700" />
                            </button>
                            <div style={{ flexShrink: 0 }}>
                                <FollowButton
                                    currentUserId={currentUserId}
                                    targetUserId={userId}
                                    preloadedIsFollowing={preloadedIsFollowing}
                                />
                            </div>
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
                <div className="flex items-center gap-4 -mt-1" style={{ marginLeft: "-15px" }}>
                    {/* Follower Stat */}
                    <button
                        className="flex items-center gap-1 hover:underline transition-all text-sm text-[#000000]"
                        onClick={() => {
                            // TODO: Open followers list modal/page
                            console.log("Open followers list");
                        }}
                    >
                        <span className="font-semibold inline-block min-w-[3ch] text-right">
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
                        <span className="font-semibold inline-block min-w-[3ch] text-right">
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
                    isUploading={isUploading}
                />
            )}
        </div>
    );
}
