"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import QuickPinchZoom, { make3dTransformValue } from "react-quick-pinch-zoom";

interface ImageLightboxProps {
  images: string[]; // Array aller Bilder im Post
  currentIndex: number | null; // Index des aktuell geöffneten Bildes (null = geschlossen)
  onClose: () => void; // Callback zum Schließen
  onImageChange?: (newIndex: number) => void; // Callback für Bild-Wechsel (optional, für Navigation)
}

/**
 * ImageLightbox - Twitter/X-ähnliche mobile-optimierte Lightbox für Bilder
 * 
 * Mobile Features:
 * - Full-Screen Overlay mit tiefschwarzem Hintergrund
 * - Swipe-to-Dismiss (nach oben/unten ziehen zum Schließen)
 * - Pinch-to-Zoom mit react-quick-pinch-zoom
 * - Auto-Hide UI nach 2 Sekunden Inaktivität
 * - ArrowLeft Button für mobile App-Gefühl
 * - Höchste Bildqualität für Mobile
 */
export function ImageLightbox({ images, currentIndex, onClose, onImageChange }: ImageLightboxProps) {
  const isOpen = currentIndex !== null && currentIndex >= 0 && currentIndex < images.length;
  const currentImage = isOpen ? images[currentIndex] : null;
  const hasMultipleImages = images.length > 1;

  // UI immer sichtbar lassen (kein Auto-Hide)
  const uiVisible = true;
  const imgRef = useRef<HTMLDivElement>(null);
  const [currentScale, setCurrentScale] = useState(1);

  // Motion values für Swipe-to-Dismiss
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-300, 0, 300], [0, 1, 0]);

  // Handle Touch/Click auf Bild - zeige UI und reset Timer
  const handleImageInteraction = useCallback(() => {
    // No-op since UI is always visible
  }, []);

  // Handler für Pinch Zoom Updates
  const handlePinchUpdate = useCallback(({ x, y, scale }: { x: number; y: number; scale: number }) => {
    if (imgRef.current) {
      const value = make3dTransformValue({ x, y, scale });
      imgRef.current.style.setProperty('transform', value);
      setCurrentScale(scale);
    }
  }, []);

  // Verhindere Body-Scroll wenn Lightbox geöffnet ist
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Reset motion values wenn Lightbox öffnet
      y.set(0);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, y]);


  // Keyboard-Handler (Esc zum Schließen, Pfeiltasten zum Navigieren)
  useEffect(() => {
    if (!isOpen || !onImageChange) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (hasMultipleImages && currentIndex !== null) {
        if (e.key === "ArrowLeft" && currentIndex > 0) {
          e.preventDefault();
          onImageChange(currentIndex - 1);
        } else if (e.key === "ArrowRight" && currentIndex < images.length - 1) {
          e.preventDefault();
          onImageChange(currentIndex + 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, hasMultipleImages, onImageChange, images.length, onClose]);

  // Handler für Swipe-to-Dismiss (nur wenn nicht gezoomt)
  const handleDragEnd = useCallback((event: any, info: any) => {
    // Nur Swipe-to-Dismiss erlauben wenn nicht gezoomt
    if (currentScale > 1.1) {
      y.set(0);
      return;
    }

    const threshold = 100; // Mindest-Distanz zum Schließen

    if (Math.abs(info.offset.y) > threshold) {
      onClose();
    } else {
      // Spring zurück zur Mitte
      y.set(0);
    }
  }, [onClose, y, currentScale]);

  // Reset Drag-Position und Zoom wenn Bild wechselt
  useEffect(() => {
    if (isOpen) {
      y.set(0);
      setCurrentScale(1);
      // Reset Zoom-Transform
      if (imgRef.current) {
        imgRef.current.style.setProperty('transform', 'translate3d(0px, 0px, 0px) scale(1)');
      }
    }
  }, [currentIndex, isOpen, y]);

  return (
    <AnimatePresence>
      {isOpen && currentImage && (
        <motion.div
          key={`lightbox-${currentIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black z-[100] flex items-center justify-center"
          style={{ opacity }}
        >
          {/* Bild-Container mit Swipe-to-Dismiss */}
          <motion.div
            drag={currentScale <= 1.1 ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ y, opacity }}
            className="absolute inset-0 flex items-center justify-center touch-none"
            onClick={handleImageInteraction}
            onTouchStart={handleImageInteraction}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <QuickPinchZoom
                key={`pinch-${currentIndex}`}
                minZoom={1}
                maxZoom={4}
                wheelScaleFactor={100}
                doubleTapZoomOutOnMaxScale
                onUpdate={handlePinchUpdate}
              >
                <div
                  ref={imgRef}
                  className="relative w-full h-full flex items-center justify-center"
                  onClick={handleImageInteraction}
                  onTouchStart={handleImageInteraction}
                >
                  <Image
                    src={currentImage}
                    alt={`Bild ${currentIndex! + 1} von ${images.length}`}
                    width={2560}
                    height={2560}
                    className="w-auto h-auto max-w-full max-h-screen object-contain pointer-events-none"
                    quality={100}
                    priority
                    sizes="100vw"
                    unoptimized={false}
                  />
                </div>
              </QuickPinchZoom>
            </div>
          </motion.div>

          {/* UI-Elemente mit Auto-Hide */}
          <AnimatePresence>
            {uiVisible && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 pointer-events-none z-[110]"
              >
                {/* Zurück-Button oben links (Mobile App-Style) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="absolute top-4 left-4 pointer-events-auto h-10 w-10 flex items-center justify-center rounded-full bg-black/50 active:bg-black/70 text-white transition-colors focus:outline-none"
                  aria-label="Zurück"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>

                {/* Navigation: Vorheriges Bild (links) */}
                {hasMultipleImages && currentIndex !== null && currentIndex > 0 && onImageChange && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageChange(currentIndex - 1);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-auto h-12 w-12 flex items-center justify-center rounded-full bg-black/50 active:bg-black/70 text-white transition-colors focus:outline-none"
                    aria-label="Vorheriges Bild"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}

                {/* Navigation: Nächstes Bild (rechts) */}
                {hasMultipleImages && currentIndex !== null && currentIndex < images.length - 1 && onImageChange && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageChange(currentIndex + 1);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto h-12 w-12 flex items-center justify-center rounded-full bg-black/50 active:bg-black/70 text-white transition-colors focus:outline-none"
                    aria-label="Nächstes Bild"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}

                {/* Bild-Counter (unten mittig, wenn mehrere Bilder) */}
                {hasMultipleImages && currentIndex !== null && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/50 text-white text-sm">
                    {currentIndex + 1} / {images.length}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
