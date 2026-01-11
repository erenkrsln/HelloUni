"use client";

import Image from "next/image";
import { X, ImageIcon } from "lucide-react";

interface ImageGridProps {
    images: string[];
    onRemove: (index: number) => void;
}

export function ImageGrid({ images, onRemove }: ImageGridProps) {
    if (!images || images.length === 0) return null;

    const renderGridImage = (src: string, index: number, className: string, sizes: string) => (
        <div key={src} className={`relative bg-gray-100 overflow-hidden h-full w-full ${className}`}>
            <Image
                src={src}
                alt={`Preview ${index + 1}`}
                fill
                className="object-cover"
                sizes={sizes}
                unoptimized
            />
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove(index);
                }}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors backdrop-blur-sm z-10"
                aria-label="Bild entfernen"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );

    // 1 Image - Dynamic Size (Mobile full, Desktop limited)
    if (images.length === 1) {
        return (
            <div className="relative inline-block w-full md:w-auto overflow-hidden rounded-2xl border border-gray-200">
                <div className="relative" key={images[0]}>
                    <img
                        src={images[0]}
                        alt="Preview"
                        className="w-full md:w-auto h-auto max-h-[600px] md:max-w-[512px] object-contain"
                        style={{ width: 'auto', height: 'auto', maxWidth: '100%' }}
                    />
                    <button
                        type="button"
                        onClick={() => onRemove(0)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors backdrop-blur-sm z-10"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    // Grid Layout (2-4 Images)
    return (
        <div className={`grid w-full aspect-[16/9] rounded-2xl overflow-hidden border border-gray-200 gap-0.5 md:gap-2 
             ${images.length === 2 ? "grid-cols-2" : ""}
             ${images.length === 3 ? "grid-cols-2 grid-rows-2" : ""}
             ${images.length >= 4 ? "grid-cols-2 grid-rows-2" : ""}
        `}>
            {images.length === 2 && (
                <>
                    {renderGridImage(images[0], 0, "", "50vw")}
                    {renderGridImage(images[1], 1, "", "50vw")}
                </>
            )}

            {images.length === 3 && (
                <>
                    {renderGridImage(images[0], 0, "row-span-2", "50vw")}
                    {renderGridImage(images[1], 1, "", "25vw")}
                    {renderGridImage(images[2], 2, "", "25vw")}
                </>
            )}

            {images.length >= 4 && (
                <>
                    {renderGridImage(images[0], 0, "", "50vw")}
                    {renderGridImage(images[1], 1, "", "50vw")}
                    {renderGridImage(images[2], 2, "", "50vw")}
                    {renderGridImage(images[3], 3, "", "50vw")}
                </>
            )}
        </div>
    );
}
