"use client";

import { ImageWithPlaceholder } from "@/components/ui/image-with-placeholder";

interface PostImageGridProps {
  images: string[]; // Array von Bild-URLs (max 4)
  imageDimensions?: Array<{ width: number; height: number }>; // Array von Bilddimensionen (parallel zu images)
  className?: string;
  onImageClick?: (imageIndex: number) => void; // Callback mit Index des angeklickten Bildes
  priority?: boolean; // Für Next.js Image priority (erste Posts im Feed)
}

/**
 * PostImageGrid - Exaktes Twitter (X) Multi-Image Grid
 * 
 * Layout-Regeln (Twitter-Standard):
 * - 1 Bild: Volle Breite, max 4:5 Aspect Ratio (oben/unten abgeschnitten bei längeren Bildern)
 * - 2 Bilder: 50/50 Split nebeneinander, festes 7:8 Aspect Ratio
 * - 3 Bilder: Links großes Bild (7:16), rechts zwei kleine übereinander (7:8)
 * - 4 Bilder: 2x2 Grid, festes 2:1 Aspect Ratio
 * 
 * Styling:
 * - gap-0.5 (2px) zwischen Bildern
 * - rounded-2xl (16px) Container mit overflow-hidden
 * - Border: border-slate-200 dark:border-slate-800
 */
import { memo } from "react";

// ...

export const PostImageGrid = memo(function PostImageGrid({ images, imageDimensions, className = "", onImageClick, priority = false }: PostImageGridProps) {
  // Begrenze auf max 4 Bilder (Twitter-Limit)
  const displayImages = images.slice(0, 4).filter(img => img && img.trim() !== ""); // Filtere leere URLs
  const imageCount = displayImages.length;

  if (imageCount === 0) {
    return null;
  }

  const handleImageClick = (index: number) => {
    if (onImageClick) {
      onImageClick(index);
    }
  };

  // 1 Bild: Volle Breite, Aspect Ratio mit 4:5-Begrenzung (Twitter-Standard)
  if (imageCount === 1) {
    return (
      <div
        className={`mt-3 w-full ${className} cursor-pointer`}
        onClick={() => handleImageClick(0)}
      >
        <ImageWithPlaceholder
          src={displayImages[0]}
          alt="Post image"
          width={imageDimensions?.[0]?.width}
          height={imageDimensions?.[0]?.height}
          priority={priority}
          sizes="(max-width: 768px) 100vw, 512px"
          useContainerAspectRatio={false}
        />
      </div>
    );
  }

  // 2 Bilder: 50/50 Split, festes 7:8 Aspect Ratio
  if (imageCount === 2) {
    return (
      <div className={`mt-3 w-full grid grid-cols-2 gap-0.5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 ${className}`}>
        {displayImages.map((image, index) => {
          const roundedClasses = index === 0 ? "rounded-l-2xl" : "rounded-r-2xl";
          return (
            <div
              key={index}
              className={`relative aspect-[7/8] overflow-hidden ${roundedClasses} cursor-pointer`}
              onClick={() => handleImageClick(index)}
            >
              <ImageWithPlaceholder
                src={image}
                alt={`Post image ${index + 1}`}
                priority={priority}
                sizes="(max-width: 768px) 50vw, 256px"
                useContainerAspectRatio={true}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // 3 Bilder: Links großes Bild (7:16), rechts zwei kleine übereinander (7:8)
  if (imageCount === 3) {
    return (
      <div className={`mt-3 w-full grid grid-cols-2 gap-0.5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 ${className}`}>
        {/* Großes Bild links - spannt beide Zeilen mit Aspect Ratio 7:16 */}
        <div
          className="row-span-2 relative aspect-[7/16] overflow-hidden rounded-l-2xl cursor-pointer"
          onClick={() => handleImageClick(0)}
        >
          <ImageWithPlaceholder
            src={displayImages[0]}
            alt="Post image 1"
            priority={priority}
            sizes="(max-width: 768px) 50vw, 256px"
            useContainerAspectRatio={true}
          />
        </div>

        {/* Zwei kleine Bilder rechts - übereinander gestapelt mit 7:8 Aspect Ratio */}
        <div
          className="relative aspect-[7/8] overflow-hidden rounded-tr-2xl cursor-pointer"
          onClick={() => handleImageClick(1)}
        >
          <ImageWithPlaceholder
            src={displayImages[1]}
            alt="Post image 2"
            priority={priority}
            sizes="(max-width: 768px) 50vw, 256px"
            useContainerAspectRatio={true}
          />
        </div>

        <div
          className="relative aspect-[7/8] overflow-hidden rounded-br-2xl cursor-pointer"
          onClick={() => handleImageClick(2)}
        >
          <ImageWithPlaceholder
            src={displayImages[2]}
            alt="Post image 3"
            priority={priority}
            sizes="(max-width: 768px) 50vw, 256px"
            useContainerAspectRatio={true}
          />
        </div>
      </div>
    );
  }

  // 4 Bilder: 2x2 Grid, festes 2:1 Aspect Ratio
  // Twitter Style: Beide Zeilen gleich hoch
  return (
    <div className={`mt-3 w-full grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 ${className}`}>
      {displayImages.map((image, index) => {
        // Bestimme abgerundete Ecken basierend auf Position
        let roundedClasses = "";
        if (index === 0) roundedClasses = "rounded-tl-2xl"; // Oben links
        else if (index === 1) roundedClasses = "rounded-tr-2xl"; // Oben rechts
        else if (index === 2) roundedClasses = "rounded-bl-2xl"; // Unten links
        else if (index === 3) roundedClasses = "rounded-br-2xl"; // Unten rechts

        return (
          <div
            key={index}
            className={`relative aspect-[2/1] overflow-hidden ${roundedClasses} cursor-pointer`}
            onClick={() => handleImageClick(index)}
          >
            <ImageWithPlaceholder
              src={image}
              alt={`Post image ${index + 1}`}
              priority={priority}
              sizes="(max-width: 768px) 50vw, 256px"
              useContainerAspectRatio={true}
            />
          </div>
        );
      })}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom Comparison Function für React.memo
  // Verhindert unnötige Re-Renders, wenn sich nur Callback-Funktionen oder irrelevante Props ändern

  // 1. Prüfe, ob die Anzahl der Bilder gleich ist
  if (prevProps.images.length !== nextProps.images.length) return false;

  // 2. Prüfe, ob alle Bild-URLs identisch sind
  for (let i = 0; i < prevProps.images.length; i++) {
    if (prevProps.images[i] !== nextProps.images[i]) return false;
  }

  // 3. Prüfe Priority-Flag
  if (prevProps.priority !== nextProps.priority) return false;

  // 4. Prüfe ImageDimensions (deep check wenn vorhanden)
  const prevDims = prevProps.imageDimensions;
  const nextDims = nextProps.imageDimensions;

  if (!prevDims && !nextDims) return true; // Beide undefined -> gleich
  if (!prevDims || !nextDims) return false; // Eines undefined -> ungleich
  if (prevDims.length !== nextDims.length) return false;

  for (let i = 0; i < prevDims.length; i++) {
    if (prevDims[i].width !== nextDims[i].width || prevDims[i].height !== nextDims[i].height) {
      return false;
    }
  }

  // da 'className' meist statisch ist und 'onImageClick' oft neu erstellt wird aber funktionell gleich bleibt.
  return true;
});
