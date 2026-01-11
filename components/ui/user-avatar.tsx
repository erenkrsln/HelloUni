"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { AvatarFallback } from "@/components/ui/avatar";

interface UserAvatarProps {
    src?: string;
    alt: string;
    size?: "sm" | "md" | "lg" | "xl";
    fallbackText?: string;
    priority?: boolean;
    className?: string;
}

/**
 * UserAvatar - Professionelle Avatar-Komponente mit Layout-Shift-Prevention
 * 
 * Features:
 * - Feste Größe (kein Layout-Shift)
 * - Shimmer-Platzhalter während des Ladens
 * - Smooth Fade-In (300ms) beim ersten Laden
 * - Sofortige Anzeige bei gecachten Bildern
 * - Fallback mit Initialen bei fehlenden Bildern
 */
// Globaler Cache für bereits geladene Avatare
const loadedAvatars = new Set<string>();

export function UserAvatar({
    src,
    alt,
    size = "md",
    fallbackText,
    priority = false,
    className = "",
}: UserAvatarProps) {
    // Prüfe, ob das Bild bereits geladen wurde (Session-Cache) oder im Browser-Cache ist
    const shouldShowInstantly = (imageSrc?: string): boolean => {
        if (typeof window === 'undefined' || !imageSrc) return false;

        // 1. Session-Cache
        if (loadedAvatars.has(imageSrc)) return true;

        // 2. Browser-Check
        const img = new window.Image();
        img.src = imageSrc;
        return img.complete;
    };

    const [isImageLoaded, setIsImageLoaded] = useState(() => shouldShowInstantly(src));
    const [hasError, setHasError] = useState(false);

    // Größen-Mapping
    const sizeMap = {
        sm: { container: "w-8 h-8", pixels: 32 },
        md: { container: "w-10 h-10", pixels: 40 },
        lg: { container: "w-12 h-12", pixels: 48 },
        xl: { container: "w-16 h-16", pixels: 64 },
    };

    const sizeConfig = sizeMap[size];

    // Reset states wenn src sich ändert
    useEffect(() => {
        setIsImageLoaded(shouldShowInstantly(src));
        setHasError(false);
    }, [src]);

    // Wenn kein src oder Fehler, zeige Fallback
    if (!src || hasError) {
        return (
            <div
                className={`${sizeConfig.container} rounded-full bg-slate-200 flex items-center justify-center ${className}`}
            >
                <AvatarFallback className="font-semibold rounded-full bg-slate-200 text-slate-700 border-0">
                    {fallbackText || alt.charAt(0).toUpperCase()}
                </AvatarFallback>
            </div>
        );
    }

    return (
        <div className={`relative ${sizeConfig.container} rounded-full overflow-hidden ${className}`}>
            {/* Shimmer-Platzhalter - nur sichtbar während Bild lädt */}
            {!isImageLoaded && (
                <div className="absolute inset-0 bg-slate-200 animate-pulse rounded-full z-0" />
            )}

            {/* Profilbild mit Next.js Image */}
            <Image
                src={src}
                alt={alt}
                width={sizeConfig.pixels}
                height={sizeConfig.pixels}
                priority={priority}
                className={`rounded-full object-cover transition-opacity duration-300 ease-in-out ${!isImageLoaded ? "opacity-0" : "opacity-100"
                    }`}
                onLoad={() => {
                    if (src) loadedAvatars.add(src);
                    setIsImageLoaded(true);
                }}
                onError={() => {
                    setIsImageLoaded(false);
                    setHasError(true);
                }}
            />
        </div>
    );
}
