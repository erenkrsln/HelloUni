"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { Loader2, Camera } from "lucide-react";

interface HeaderImageWithLoadingProps {
    headerImage?: string;
    isOwnProfile?: boolean;
    onHeaderImageClick?: () => void;
}

/**
 * HeaderImageWithLoading - Optimized header image with three-phase loading
 * 
 * Phase 1: Spinner (waiting for Convex data)
 * Phase 2: Shimmer (image loading)
 * Phase 3: Image (fade-in when ready)
 * 
 * Container maintains stable 3:1 aspect ratio throughout all phases.
 */
// Globaler Cache für bereits geladene Header-Bilder
const loadedHeaderImages = new Set<string>();

export function HeaderImageWithLoading({
    headerImage,
    isOwnProfile = false,
    onHeaderImageClick,
}: HeaderImageWithLoadingProps) {
    // Prüfe, ob das Bild bereits geladen wurde
    const shouldShowInstantly = (imageSrc?: string): boolean => {
        if (typeof window === 'undefined' || !imageSrc) return false;

        // 1. Session-Cache
        if (loadedHeaderImages.has(imageSrc)) return true;

        // 2. Browser-Check
        const img = new window.Image();
        img.src = imageSrc;
        return img.complete;
    };

    const [isImageLoaded, setIsImageLoaded] = useState(() => shouldShowInstantly(headerImage));
    const [hasError, setHasError] = useState(false);

    // Reset state when headerImage changes
    useEffect(() => {
        setIsImageLoaded(shouldShowInstantly(headerImage));
        setHasError(false);
    }, [headerImage]);

    return (
        <div
            className="relative bg-slate-200 overflow-hidden group header-image-responsive"
            style={{
                aspectRatio: '3/1',
                minHeight: '120px',
            }}
        >
            {/* Phase 1: No image - show gradient background */}
            {!headerImage && !hasError && (
                <div className="absolute inset-0 bg-gradient-to-br from-[#D08945]/20 to-[#DCA067]/20 z-0" />
            )}

            {/* Phase 2: Image loading - show shimmer */}
            {headerImage && !isImageLoaded && !hasError && (
                <div className="absolute inset-0 bg-slate-200 animate-pulse z-0" />
            )}

            {/* Phase 3: Image loaded - fade in */}
            {headerImage && !hasError && (
                <Image
                    src={headerImage}
                    alt="Header"
                    fill
                    priority={true}
                    sizes="(max-width: 768px) 100vw, 1200px"
                    quality={80}
                    className={`object-cover transition-opacity duration-200 ease-in-out z-10 ${!isImageLoaded ? "opacity-0" : "opacity-100"
                        }`}
                    onLoad={() => {
                        if (headerImage) loadedHeaderImages.add(headerImage);
                        setIsImageLoaded(true);
                    }}
                    onError={() => {
                        setIsImageLoaded(false);
                        setHasError(true);
                    }}
                />
            )}

            {/* Error fallback */}
            {hasError && (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-300 to-slate-400 z-0" />
            )}
        </div>
    );
}
