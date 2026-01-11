"use client";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { ImageIcon, Loader2 } from "lucide-react";

interface ImageWithPlaceholderProps {
  src: string;
  alt: string;
  width?: number; // Originalbildbreite (aus Convex)
  height?: number; // Originalbildhöhe (aus Convex)
  aspectRatio?: "square" | "video" | "portrait" | "landscape" | "auto";
  className?: string;
  priority?: boolean;
  sizes?: string;
  useContainerAspectRatio?: boolean; // Wenn true: Container bestimmt Aspect Ratio (für Grids)
  isLoading?: boolean; // Externe Loading-State (z.B. wenn Convex-Daten noch laden)
}

/**
 * Optimierte Image-Komponente mit Phasen-Steuerung:
 * Phase 1: Global Loading (Spinner) - wenn isLoading=true
 * Phase 2: Image Loading (Shimmer) - wenn Bild noch nicht geladen
 * Phase 3: Image Ready (Bild) - wenn onLoad feuert
 * 
 * KRITISCH: Container hat IMMER stabiles Aspect Ratio - keine Layout Shifts möglich
 */
// Globaler Cache für bereits geladene Bilder in dieser Session
const loadedImages = new Set<string>();

export function ImageWithPlaceholder({
  src,
  alt,
  width,
  height,
  aspectRatio = "auto",
  className = "",
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  useContainerAspectRatio = false,
  isLoading: externalLoading = false,
}: ImageWithPlaceholderProps) {

  // Prüfe, ob das Bild bereits geladen wurde (Session-Cache) oder im Browser-Cache ist
  const shouldShowInstantly = (imageSrc: string): boolean => {
    if (typeof window === 'undefined' || !imageSrc) return false;

    // 1. Priorität: Unser eigener Session-Cache (garantiert geladen)
    if (loadedImages.has(imageSrc)) return true;

    // 2. Fallback: Browser-Check
    const img = new window.Image();
    img.src = imageSrc;
    return img.complete;
  };

  // Phase 1: Global Loading (wenn Convex-Daten noch laden)
  const [isImageLoaded, setIsImageLoaded] = useState(() => shouldShowInstantly(src));
  const [hasError, setHasError] = useState(false);

  // Reset state wenn src sich ändert
  useEffect(() => {
    // Wenn sich src ändert, prüfen wir erneut ob es sofort angezeigt werden soll
    setIsImageLoaded(shouldShowInstantly(src));
    setHasError(false);
  }, [src]);

  // Berechne tatsächliches Bild-Aspect-Ratio (ohne Begrenzung)
  const actualImageRatio = useMemo(() => {
    if (width && height) {
      return width / height;
    }
    return null;
  }, [width, height]);

  // Berechne Display Aspect Ratio mit 4:5 Begrenzung für einzelne Bilder (Twitter-Standard)
  // WICHTIG: Für einzelne Bilder wird das Aspect Ratio auf min. 0.8 (4:5) begrenzt
  // Dies verhindert, dass sehr lange Hochformatbilder den Feed dominieren
  const displayRatio = useMemo(() => {
    if (useContainerAspectRatio) {
      return undefined; // Container bestimmt Aspect Ratio (für Grids)
    }

    // Priorität 1: width/height aus Convex (höchste Priorität)
    if (width && height) {
      const actualRatio = width / height;
      // Begrenze Hochformatbilder auf maximal 4:5 (0.8)
      // Bilder die höher sind als 4:5 werden abgeschnitten (object-cover)
      // Beispiel: 9:16 (0.5625) -> wird zu 4:5 (0.8)
      // Querformatbilder (z.B. 16:9 = 1.77) bleiben erhalten
      const limitedRatio = Math.max(actualRatio, 0.8);
      return limitedRatio;
    }

    // Priorität 2: Manuell gesetztes Aspect Ratio
    if (aspectRatio && aspectRatio !== "auto") {
      const aspectMap: Record<string, number> = {
        square: 1,
        portrait: 4 / 5,
        landscape: 16 / 9,
        video: 16 / 9,
      };
      return aspectMap[aspectRatio] || 1.777;
    }

    // KRITISCH: Kein Fallback für einzelne Bilder ohne Dimensionen
    // Wenn keine Dimensionen verfügbar sind, geben wir undefined zurück
    // Dies verhindert, dass ein falscher Container gerendert wird
    return undefined;
  }, [width, height, aspectRatio, useContainerAspectRatio]);

  // Stabiler Wrapper-Style - IMMER stabil, ändert sich nie
  // KRITISCH: Dieser Container definiert das Aspect Ratio und reserviert den Platz SOFORT
  const wrapperStyle = useMemo(() => {
    if (useContainerAspectRatio) {
      return {
        className: "relative w-full h-full overflow-hidden",
        style: {} as React.CSSProperties,
      };
    }

    // KRITISCH: Verwende displayRatio als inline style für den Wrapper
    // Dies stellt sicher, dass der Browser den Platz SOFORT reserviert
    // Der Container hat IMMER dieselbe Höhe - keine Layout Shifts möglich
    return {
      className: "relative w-full overflow-hidden",
      style: {
        aspectRatio: displayRatio !== undefined ? `${displayRatio}` : undefined,
        width: "100%",
        position: "relative" as const,
      } as React.CSSProperties,
    };
  }, [displayRatio, useContainerAspectRatio]);

  // Bestimme ob object-cover verwendet werden soll
  // KRITISCH: Wenn das Display-Ratio vom tatsächlichen Bild-Ratio abweicht (durch 4:5 Begrenzung),
  // verwende object-cover, um den Container vollständig zu füllen
  const shouldUseObjectCover = useMemo(() => {
    if (useContainerAspectRatio) return true; // Für Grids immer object-cover

    // Für einzelne Bilder: Verwende object-cover wenn Ratio begrenzt wurde
    // Dies passiert bei Hochformatbildern, die auf 4:5 begrenzt wurden
    if (actualImageRatio !== null && displayRatio !== undefined) {
      // Wenn displayRatio größer ist als actualImageRatio, wurde das Bild begrenzt
      // Beispiel: Bild ist 0.5 (sehr hoch), displayRatio ist 0.8 (4:5 Limit)
      return displayRatio > actualImageRatio;
    }

    return false;
  }, [useContainerAspectRatio, actualImageRatio, displayRatio]);

  // Loading State behandeln
  if (externalLoading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 dark:bg-gray-800`}>
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Fallback bei Fehler
  if (hasError) {
    return (
      <div
        className={`
          ${wrapperStyle.className}
          flex items-center justify-center
          ${useContainerAspectRatio ? "" : "rounded-2xl"}
          ${useContainerAspectRatio ? "" : "border border-slate-200 dark:border-slate-800"}
          bg-gray-100
          ${className}
        `}
        style={wrapperStyle.style}
      >
        <div className="flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
          <ImageIcon className="w-12 h-12" strokeWidth={1.5} />
          <span className="text-xs">Bild konnte nicht geladen werden</span>
        </div>
      </div>
    );
  }

  // KRITISCH: Wenn displayRatio undefined ist (einzelnes Bild ohne Dimensionen aus Convex),
  // verwenden wir einen Fallback mit festen Dimensionen für Next.js Image
  // Dies ist nicht ideal (Layout-Shift möglich), aber besser als kein Bild
  if (!useContainerAspectRatio && displayRatio === undefined) {
    return (
      <div className={`relative w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 ${className}`}>
        {/* Shimmer-Hintergrund - nur sichtbar während Bild lädt */}
        {!isImageLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse z-0" />
        )}

        {/* Bild mit Fallback-Dimensionen (Layout-Shift möglich, aber Bild wird angezeigt) */}
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={900}
          sizes={sizes}
          priority={priority}
          className={`relative w-full h-auto transition-opacity duration-500 ease-in-out z-10 ${!isImageLoaded ? "opacity-0" : "opacity-100"}`}
          onLoad={() => {
            loadedImages.add(src); // Zum Cache hinzufügen
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

  return (
    <div
      {...wrapperStyle}
      className={`${wrapperStyle.className} ${useContainerAspectRatio ? "" : "rounded-2xl"} ${useContainerAspectRatio ? "" : "border border-slate-200 dark:border-slate-800"} ${className}`}
    >
      {/* Shimmer-Placeholder (sichtbar bis Bild geladen) */}
      {!isImageLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse z-0" />
      )}

      {/* Das eigentliche Bild */}
      {/* KRITISCH: fill macht das Bild automatisch absolut positioniert, füllt den Wrapper exakt aus */}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`
          ${shouldUseObjectCover ? "object-cover" : "object-contain"}
          transition-opacity duration-500 ease-in-out
          z-10
          ${!isImageLoaded ? "opacity-0" : "opacity-100"}
        `}
        onLoad={() => {
          // WICHTIG: onLoad feuert, wenn das Bild vollständig geladen ist
          // Der Container ändert seine Größe NICHT - Shimmer und Bild füllen denselben Raum aus
          loadedImages.add(src); // Zum Cache hinzufügen
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
