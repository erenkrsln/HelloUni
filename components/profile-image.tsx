"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileImageProps {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
};

const iconSizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

// Cache für bereits geladene Bilder
const loadedImagesCache = new Set<string>();

// Prüfe ob Bild bereits im Browser-Cache ist (synchron)
const checkImageCached = (src: string): boolean => {
  if (typeof window === 'undefined') return false;
  if (loadedImagesCache.has(src)) return true;
  
  try {
    const img = document.createElement('img');
    img.src = src;
    if (img.complete && img.naturalWidth > 0) {
      loadedImagesCache.add(src);
      return true;
    }
  } catch {
    // Ignoriere Fehler
  }
  return false;
};

export function ProfileImage({
  src,
  alt,
  size = "md",
  className,
  priority = false,
}: ProfileImageProps) {
  // Initial state basierend auf Cache
  const [isLoading, setIsLoading] = useState(() => {
    if (!src) return false;
    return !checkImageCached(src);
  });
  const [hasError, setHasError] = useState(false);

  const containerSize = sizeClasses[size];
  const iconSize = iconSizeClasses[size];

  // Prüfe ob Bild bereits geladen ist (Browser-Cache)
  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    // Prüfe Cache - wenn Bild bereits einmal geladen wurde, zeige es sofort
    if (loadedImagesCache.has(src)) {
      setIsLoading(false);
      setHasError(false);
      return;
    }

    // Prüfe ob Bild bereits im Browser-Cache ist
    if (typeof window === 'undefined') {
      setIsLoading(true);
      return;
    }
    
    const img = document.createElement('img');
    img.src = src;
    
    // Wenn Bild bereits vollständig geladen ist (Browser-Cache)
    if (img.complete && img.naturalWidth > 0) {
      loadedImagesCache.add(src);
      setIsLoading(false);
      setHasError(false);
      return;
    }
    
    // Bild muss noch geladen werden
    setIsLoading(true);
    setHasError(false);
    
    const handleLoad = () => {
      loadedImagesCache.add(src);
      setIsLoading(false);
    };
    
    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
    };
    
    img.onload = handleLoad;
    img.onerror = handleError;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  // If no src, show fallback immediately
  const showFallback = !src || hasError;

  return (
    <div
      className={cn(
        "relative flex-shrink-0 rounded-full overflow-hidden",
        containerSize,
        className
      )}
      style={{
        willChange: "transform",
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      {/* Shimmer-Effekt während des Ladens */}
      {!showFallback && isLoading && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse rounded-full" />
      )}

      {/* Fallback für fehlende Bilder */}
      {showFallback ? (
        <div className="absolute inset-0 bg-gray-200 rounded-full flex items-center justify-center">
          <User className={cn("text-gray-400", iconSize)} />
        </div>
      ) : (
        /* Next.js Image mit Fade-in */
        <Image
          src={src}
          alt={alt}
          fill
          className={cn(
            "object-cover rounded-full transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          priority={priority}
          sizes={`${size === "sm" ? "32" : size === "md" ? "48" : "64"}px`}
          onLoad={() => {
            if (src) {
              loadedImagesCache.add(src);
            }
            setIsLoading(false);
          }}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
        />
      )}
    </div>
  );
}

