"use client";

import { useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ImageModalProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageModal({ imageUrl, isOpen, onClose }: ImageModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 rounded-full bg-white/10 backdrop-blur-md p-2.5 text-white hover:bg-white/20 transition-all hover:scale-110 border border-white/20"
        aria-label="Bild schließen"
      >
        <XMarkIcon className="h-6 w-6" />
      </button>
      <div 
        className="relative w-full h-full flex items-center justify-center p-8"
      >
        {/* Klickbarer Bereich links vom Bild */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1/4 cursor-pointer"
          onClick={onClose}
        />
        {/* Klickbarer Bereich rechts vom Bild */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-1/4 cursor-pointer"
          onClick={onClose}
        />
        {/* Klickbarer Bereich oben vom Bild */}
        <div 
          className="absolute top-0 left-0 right-0 h-1/4 cursor-pointer"
          onClick={onClose}
        />
        {/* Klickbarer Bereich unten vom Bild */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-1/4 cursor-pointer"
          onClick={onClose}
        />
        {/* Bild Container - verhindert Klick-Propagation */}
        <div
          className="relative z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Post image"
            className="max-h-[95vh] max-w-[95vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  );
}

