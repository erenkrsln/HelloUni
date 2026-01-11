"use client";

import { ImageWithPlaceholder } from "@/components/ui/image-with-placeholder";

interface ImageGridProps {
  images: string[]; // Array von Bild-URLs (max 4)
  className?: string;
}

/**
 * Twitter-ähnliches Image Grid für 1-4 Bilder
 * 
 * Layout-Regeln:
 * - 1 Bild: Volle Breite, max 4:5 Aspect Ratio
 * - 2 Bilder: Zwei Bilder nebeneinander (50% / 50%), 7:8 Aspect Ratio, 2px Gap
 * - 3 Bilder: Großes Bild links, zwei kleinere rechts übereinander
 * - 4 Bilder: 2x2 Grid mit 2px Gap zwischen allen Bildern
 */
export function ImageGrid({ images, className = "" }: ImageGridProps) {
  // Begrenze auf max 4 Bilder
  const displayImages = images.slice(0, 4);
  const imageCount = displayImages.length;

  if (imageCount === 0) return null;

  // 1 Bild: Volle Breite
  if (imageCount === 1) {
    return (
      <div className={`mt-3 w-full ${className}`}>
        <ImageWithPlaceholder
          src={displayImages[0]}
          alt="Post image"
          priority={false}
          sizes="(max-width: 767px) 100vw, 512px"
        />
      </div>
    );
  }

  // 2 Bilder: Nebeneinander mit 2px Gap
  if (imageCount === 2) {
    return (
      <div className={`mt-3 w-full grid grid-cols-2 gap-[2px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 ${className}`}>
        {displayImages.map((image, index) => {
          const roundedClasses = index === 0 ? "rounded-l-2xl" : "rounded-r-2xl";
          return (
            <div key={index} className={`relative aspect-[7/8] overflow-hidden ${roundedClasses}`}>
              <ImageWithPlaceholder
                src={image}
                alt={`Post image ${index + 1}`}
                priority={false}
                sizes="(max-width: 767px) 50vw, 256px"
                useContainerAspectRatio={true}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // 3 Bilder: Großes Bild links (spannt beide Zeilen), zwei kleine rechts übereinander
  // Das linke Bild hat Aspect Ratio 7:16 (zwei 7:8 Bilder übereinander = 7:16)
  if (imageCount === 3) {
    return (
      <div className={`mt-3 w-full grid grid-cols-2 gap-[2px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 ${className}`}>
        {/* Großes Bild links - spannt beide Zeilen mit Aspect Ratio 7:16 */}
        <div className="row-span-2 relative aspect-[7/16] overflow-hidden rounded-l-2xl">
          <ImageWithPlaceholder
            src={displayImages[0]}
            alt="Post image 1"
            priority={false}
            sizes="(max-width: 767px) 50vw, 256px"
            useContainerAspectRatio={true}
          />
        </div>
        
        {/* Zwei kleine Bilder rechts - übereinander gestapelt mit 7:8 Aspect Ratio */}
        <div className="relative aspect-[7/8] overflow-hidden rounded-tr-2xl">
          <ImageWithPlaceholder
            src={displayImages[1]}
            alt="Post image 2"
            priority={false}
            sizes="(max-width: 767px) 50vw, 256px"
            useContainerAspectRatio={true}
          />
        </div>
        
        <div className="relative aspect-[7/8] overflow-hidden rounded-br-2xl">
          <ImageWithPlaceholder
            src={displayImages[2]}
            alt="Post image 3"
            priority={false}
            sizes="(max-width: 767px) 50vw, 256px"
            useContainerAspectRatio={true}
          />
        </div>
      </div>
    );
  }

  // 4 Bilder: 2x2 Grid mit 2px Gap
  return (
    <div className={`mt-3 w-full grid grid-cols-2 gap-[2px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 ${className}`}>
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
            className={`relative aspect-square overflow-hidden ${roundedClasses}`}
          >
            <ImageWithPlaceholder
              src={image}
              alt={`Post image ${index + 1}`}
              priority={false}
              sizes="(max-width: 767px) 50vw, 256px"
              useContainerAspectRatio={true}
            />
          </div>
        );
      })}
    </div>
  );
}

