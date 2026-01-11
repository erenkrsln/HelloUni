"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { formatTimeAgo } from "@/lib/utils";
import { ProfileImage } from "@/components/profile-image";
import { renderContentWithMentions } from "@/lib/mentions";
import { PostActions } from "@/components/post-actions";
import Link from "next/link";

// Define param type for Next.js 15+
type Params = Promise<{ photoId: string }>;

export default function PhotoPage({ params }: { params: Params }) {
    const router = useRouter();
    const currentUser = useCurrentUser();
    const [photoId, setPhotoId] = useState<string | null>(null);

    useEffect(() => {
        params.then((p) => setPhotoId(decodeURIComponent(p.photoId)));
    }, [params]);

    const post = useQuery(
        api.queries.getPostByImage,
        photoId ? { imageId: photoId, userId: currentUser?.currentUser?._id } : "skip"
    );

    const likePost = useMutation(api.mutations.likePost);
    const [isLiking, setIsLiking] = useState(false);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

    const navigateImage = (direction: 'prev' | 'next') => {
        if (!post || !post.imageUrls) return;

        let newIndex = direction === 'next' ? currentImageIndex + 1 : currentImageIndex - 1;

        if (newIndex < 0) newIndex = 0;
        if (newIndex >= post.imageUrls.length) newIndex = post.imageUrls.length - 1;

        setCurrentImageIndex(newIndex);
    };

    if (!photoId) return null;

    let displayImageUrl = photoId;
    if (post?.imageUrls && post.imageUrls.length > 0) {
        displayImageUrl = post.imageUrls[currentImageIndex];
    } else if (post?.imageUrl) {
        displayImageUrl = post.imageUrl;
    }

    const isLoading = post === undefined;

    const handleClose = () => {
        router.push("/home");
    };

    return (
        <div className="min-h-screen bg-black flex flex-col md:flex-row">
            {/* --- Left/Top: Image Area --- */}
            <div className="relative flex-1 bg-black flex items-center justify-center min-h-[50vh] md:h-screen">
                {/* Back Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 left-4 z-20 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>

                {/* Navigation Arrows */}
                {post && post.imageUrls && post.imageUrls.length > 1 && (
                    <>
                        {currentImageIndex > 0 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); navigateImage('prev'); }}
                                className="absolute left-4 z-20 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                                style={{ top: '50%', transform: 'translateY(-50%)' }}
                            >
                                <ChevronLeft size={24} />
                            </button>
                        )}
                        {currentImageIndex < post.imageUrls.length - 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); navigateImage('next'); }}
                                className="absolute right-4 z-20 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                                style={{ top: '50%', transform: 'translateY(-50%)' }}
                            >
                                <ChevronRight size={24} />
                            </button>
                        )}
                    </>
                )}

                <div className="relative w-full h-full flex items-center justify-center p-4">
                    <Image
                        src={displayImageUrl}
                        alt="Post content"
                        width={1200}
                        height={1200}
                        className="object-contain max-h-[90vh] w-auto h-auto"
                        priority
                    />
                </div>
            </div>

            {/* --- Right/Bottom: Info Sidebar --- */}
            <div className="w-full md:w-[400px] bg-white border-l border-gray-100 flex-shrink-0 flex flex-col h-auto md:h-screen">
                {/* Header (Desktop only) */}
                <div className="hidden md:flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="font-semibold text-lg">Post</h2>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                {!post ? (
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
        </div>
    );
}
