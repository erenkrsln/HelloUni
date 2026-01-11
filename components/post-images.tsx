"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { ImageIcon } from "lucide-react";
import Link from "next/link";

interface PostImagesProps {
    images: string[];
    priority?: boolean;
}

// Cache für bereits geladene Bilder
const loadedImagesCache = new Set<string>();

const checkImageCached = (url: string): boolean => {
    if (typeof window === 'undefined') return false;
    if (loadedImagesCache.has(url)) return true;

    try {
        const img = document.createElement('img');
        img.src = url;
        if (img.complete && img.naturalWidth > 0) {
            loadedImagesCache.add(url);
            return true;
        }
    } catch {
        // Ignoriere Fehler
    }
    return false;
};

export function PostImages({ images, priority = false }: PostImagesProps) {
    const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        images.forEach(url => {
            initial[url] = checkImageCached(url);
        });
        return initial;
    });

    const [errorImages, setErrorImages] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // Nachträgliche Prüfung für den Fall von Cache-Misses beim Initial-Render
        images.forEach(url => {
            if (!loadedImages[url] && checkImageCached(url)) {
                setLoadedImages(prev => ({ ...prev, [url]: true }));
            }
        });
    }, [images]);

    if (!images || images.length === 0) return null;

    const handleImageLoad = (url: string) => {
        loadedImagesCache.add(url);
        setLoadedImages(prev => ({ ...prev, [url]: true }));
    };

    const handleImageError = (url: string) => {
        setErrorImages(prev => ({ ...prev, [url]: true }));
    };

    const renderGridImage = (url: string, index: number, className: string, sizes: string) => (
        <Link
            key={`${url}-${index}`}
            href={`/photo/${encodeURIComponent(url)}`}
            scroll={false}
            className={`relative block h-full w-full bg-gray-100 overflow-hidden group ${className}`}
            onClick={(e) => e.stopPropagation()}
        >
            {!loadedImages[url] && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse z-10" />
            )}
            <Image
                src={url}
                alt="Post image"
                fill
                className={`object-cover transition-transform duration-500 group-hover:scale-105 ${loadedImages[url] ? "opacity-100" : "opacity-0"}`}
                sizes={sizes}
                onLoad={() => handleImageLoad(url)}
                onError={() => handleImageError(url)}
            />
            {/* Soft Hover Overlay on Desktop */}
            <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10 pointer-events-none" />
        </Link>
    );

    // 1 Image - Komplett unabhängig vom Grid-Layout, in Originalgröße
    if (images.length === 1) {
        return (
            <div className="mt-3 w-full" style={{ display: 'block' }}>
                <Link
                    href={`/photo/${encodeURIComponent(images[0])}`}
                    scroll={false}
                    onClick={(e) => e.stopPropagation()}
                    className="relative inline-block rounded-2xl border border-gray-100 bg-gray-100 overflow-hidden"
                    style={{ 
                        maxWidth: '100%',
                        display: 'inline-block'
                    }}
                >
                    {!loadedImages[images[0]] && (
                        <div className="absolute inset-0 bg-gray-200 animate-pulse z-10" />
                    )}
                    {/* 
                        Bild in Originalgröße anzeigen - komplett unabhängig vom Grid-Layout.
                        Keine Grid-Einschränkungen, keine aspect-ratio, keine festen Dimensionen.
                        Das Bild bestimmt seine eigene Größe basierend auf den Original-Dimensionen.
                        Mobile: max-width: 100% (respektiert Container-Breite).
                        Desktop: Originalgröße, respektiert aber Container-Grenzen.
                    */}
                    <img
                        src={images[0]}
                        alt="Post image"
                        className={`block transition-opacity duration-300 ${loadedImages[images[0]] ? "opacity-100" : "opacity-0"}`}
                        style={{ 
                            width: 'auto', 
                            height: 'auto', 
                            maxWidth: '100%',
                            display: 'block',
                            objectFit: 'contain'
                        }}
                        onLoad={() => handleImageLoad(images[0])}
                        onError={() => handleImageError(images[0])}
                    />
                </Link>
            </div>
        );
    }

    // Grid Layout (2-4 Images)
    return (
        <div className={`mt-3 grid w-full aspect-[16/9] rounded-2xl overflow-hidden border border-gray-100 gap-0.5 md:gap-2 
             ${images.length === 2 ? "grid-cols-2" : ""}
             ${images.length === 3 ? "grid-cols-2 grid-rows-2" : ""}
             ${images.length >= 4 ? "grid-cols-2 grid-rows-2" : ""}
        `}>
            {/* 2 Images */}
            {images.length === 2 && (
                <>
                    {renderGridImage(images[0], 0, "", "(max-width: 768px) 50vw, 33vw")}
                    {renderGridImage(images[1], 1, "", "(max-width: 768px) 50vw, 33vw")}
                </>
            )}

            {/* 3 Images */}
            {images.length === 3 && (
                <>
                    {renderGridImage(images[0], 0, "row-span-2", "(max-width: 768px) 50vw, 33vw")}
                    {renderGridImage(images[1], 1, "", "(max-width: 768px) 25vw, 16vw")}
                    {renderGridImage(images[2], 2, "", "(max-width: 768px) 25vw, 16vw")}
                </>
            )}

            {/* 4+ Images */}
            {images.length >= 4 && (
                <>
                    {renderGridImage(images[0], 0, "", "(max-width: 768px) 50vw, 25vw")}
                    {renderGridImage(images[1], 1, "", "(max-width: 768px) 50vw, 25vw")}
                    {renderGridImage(images[2], 2, "", "(max-width: 768px) 50vw, 25vw")}
                    {renderGridImage(images[3], 3, "", "(max-width: 768px) 50vw, 25vw")}
                </>
            )}
        </div>
    );
}
