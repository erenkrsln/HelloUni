"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { formatTimeAgo } from "@/lib/utils";
import { ProfileImage } from "@/components/profile-image";
import { renderContentWithMentions } from "@/lib/mentions";
import { PostActions } from "@/components/post-actions";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Define param type for Next.js 15+
type Params = Promise<{ photoId: string }>;

export default function PhotoModal({ params }: { params: Params }) {
    const router = useRouter();
    const currentUser = useCurrentUser();
    const [photoId, setPhotoId] = useState<string | null>(null);

    // Unwrap params
    useEffect(() => {
        params.then((p) => setPhotoId(decodeURIComponent(p.photoId)));
    }, [params]);

    const post = useQuery(
        api.queries.getPostByImage,
        photoId ? { imageId: photoId, userId: currentUser?.currentUser?._id } : "skip"
    );

    // Track current image index if post has multiple images
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const likePost = useMutation(api.mutations.likePost);
    const [isLiking, setIsLiking] = useState(false);

    const handleLike = async () => {
        if (!currentUser?.currentUser || !post || isLiking) return;
        setIsLiking(true);
        try {
            await likePost({ userId: currentUser.currentUser._id, postId: post._id });
        } catch (error) {
            console.error("Error liking post:", error);
        } finally {
            setIsLiking(false);
        }
    };

    useEffect(() => {
        if (post && photoId) {
            // Find index of current photoId in post's images
            let index = -1;
            if (post.imageUrls) {
                index = post.imageUrls.findIndex(url => url.includes(photoId) || url === photoId);
            }
            if (index === -1 && post.storageIds) {
                index = post.storageIds.findIndex(id => id === photoId);
            }

            if (index !== -1) {
                setCurrentImageIndex(index);
            }
        }
    }, [post, photoId]);

    const onDismiss = () => {
        router.back();
    };

    // Swipe logic for mobile
    const y = useMotionValue(0);
    const opacity = useTransform(y, [-200, 0, 200], [0, 1, 0]);
    const scale = useTransform(y, [-200, 0, 200], [0.8, 1, 0.8]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        if (Math.abs(info.offset.y) > 100 || Math.abs(info.velocity.y) > 500) {
            onDismiss();
        }
    };

    const navigateImage = (direction: 'prev' | 'next') => {
        if (!post || !post.imageUrls) return;
        setCurrentImageIndex(prev => {
            let newIndex = direction === 'next' ? prev + 1 : prev - 1;
            if (newIndex < 0) return 0;
            if (newIndex >= post.imageUrls!.length) return post.imageUrls!.length - 1;
            return newIndex;
        });
    };

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") navigateImage('prev');
            if (e.key === "ArrowRight") navigateImage('next');
            if (e.key === "Escape") onDismiss();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [post]);

    if (!photoId) return null;

    // Determine current image URL to display
    let displayImageUrl = photoId; // Fallback
    if (post?.imageUrls && post.imageUrls.length > 0) {
        displayImageUrl = post.imageUrls[currentImageIndex];
    } else if (post?.imageUrl) {
        displayImageUrl = post.imageUrl;
    }

    const isLoading = post === undefined;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={onDismiss} />

            <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                style={{ y, opacity, scale }}
                className="relative w-full h-full md:h-[90vh] md:w-[95vw] md:max-w-[1600px] flex flex-col md:flex-row bg-black md:rounded-2xl overflow-hidden md:bg-neutral-900 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button Mobile (Top Left overlay) */}
                <button
                    onClick={onDismiss}
                    className="absolute top-4 left-4 z-50 p-2 bg-black/50 rounded-full text-white md:hidden backdrop-blur-md"
                >
                    <X size={24} />
                </button>

                {/* --- Left: Image Area (80% on desktop) --- */}
                <div className="relative flex-1 bg-black flex items-center justify-center h-full w-full">
                    {/* Navigation Arrows (Desktop & Mobile if multiple images) */}
                    {post && post.imageUrls && post.imageUrls.length > 1 && (
                        <>
                            {currentImageIndex > 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigateImage('prev'); }}
                                    className="absolute left-4 z-20 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                            )}
                            {currentImageIndex < post.imageUrls.length - 1 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigateImage('next'); }}
                                    className="absolute right-4 z-20 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            )}
                        </>
                    )}

                    <div className="relative w-full h-full flex items-center justify-center">
                        <Image
                            src={displayImageUrl}
                            alt="Post content"
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 100vw, 80vw"
                            priority
                        />
                    </div>
                </div>

                {/* --- Right: Sidebar (20% on desktop) --- */}
                <div className="hidden md:flex flex-col w-[300px] lg:w-[25%] xl:w-[20%] h-full bg-white border-l border-gray-100 flex-shrink-0">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <h2 className="font-semibold text-lg">Post</h2>
                        <button
                            onClick={onDismiss}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* ... Content ... */}
                    {isLoading ? (
                        <div className="p-4 space-y-4">
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
                                    <div className="h-3 w-20 bg-gray-200 animate-pulse rounded" />
                                </div>
                            </div>
                            <div className="h-20 bg-gray-200 animate-pulse rounded" />
                        </div>
                    ) : !post ? (
                        <div className="p-4 text-gray-500 text-center mt-10">
                            Details nicht verfügbar
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4">
                                {/* User Info */}
                                <div className="flex items-start gap-3 mb-4">
                                    <ProfileImage
                                        src={post.user?.image}
                                        alt={post.user?.name || "User"}
                                        size="md"
                                    />
                                    <div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-bold text-gray-900">{post.user?.name}</span>
                                            <span className="text-gray-500 text-sm">@{post.user?.username}</span>
                                        </div>
                                        <div className="text-gray-500 text-xs">
                                            {post.user?.uni_name} • {formatTimeAgo(post.createdAt)}
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="text-gray-900 whitespace-pre-wrap mb-4">
                                    {renderContentWithMentions(post.content)}
                                </div>

                                {/* Stats/Actions */}
                                <div className="border-t border-b border-gray-100 py-2 mb-4">
                                    <PostActions
                                        likesCount={post.likesCount}
                                        commentsCount={post.commentsCount}
                                        isLiked={post.isLiked}
                                        onLike={handleLike}
                                        isLiking={isLiking}
                                        currentUserId={currentUser?.currentUser?._id}
                                    />
                                </div>

                                {/* Comments Placeholder */}
                                <div className="text-center text-gray-500 py-8">
                                    <p>Kommentare werden hier geladen...</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
