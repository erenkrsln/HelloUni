"use client";

import React, { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { ImagePlus, Smile, MapPin, Calendar } from "lucide-react";

interface ComposeInputProps {
  onPostCreated?: () => void;
}

export function ComposeInput({ onPostCreated }: ComposeInputProps) {
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentUserId } = useCurrentUser();
  const createPost = useMutation(api.mutations.createPost);

  // VisualViewport API für dynamische Tastatur-Höhe (iOS Standalone)
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const updatePosition = () => {
      if (!containerRef.current || !window.visualViewport || !isFocused) {
        // Tastatur geschlossen - Safe Area berücksichtigen
        if (containerRef.current) {
          containerRef.current.style.bottom = `0px`;
        }
        return;
      }

      const viewport = window.visualViewport;
      // iOS Standalone: Exakt auf Tastatur aufsitzen
      // bottom = viewport.offsetTop (Logik aus Anforderung)
      containerRef.current.style.bottom = `${viewport.offsetTop}px`;
    };

    // Initial position
    updatePosition();

    // Listener für Viewport-Änderungen
    window.visualViewport.addEventListener("resize", updatePosition);
    window.visualViewport.addEventListener("scroll", updatePosition);

    return () => {
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [isFocused]);

  // Auto-resize Textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to calculate new scroll height
    textarea.style.height = "auto";
    
    // Set height based on content (max 120px)
    const newHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = `${newHeight}px`;
  }, [content]);

  // Body Scroll Lock wenn fokussiert
  useEffect(() => {
    if (isFocused) {
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = "";
      };
    }
  }, [isFocused]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !currentUserId) return;

    try {
      await createPost({
        userId: currentUserId,
        postType: "normal",
        content: content.trim(),
      });

      // Reset
      setContent("");
      setIsFocused(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      onPostCreated?.();
    } catch (error) {
      console.error("Fehler beim Erstellen des Posts:", error);
      alert("Fehler beim Erstellen des Posts");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter zum Absenden (nur wenn nicht Shift gedrückt)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50"
      style={{
        overscrollBehavior: "none",
        paddingBottom: `env(safe-area-inset-bottom, 0px)`,
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 px-3 py-3 max-w-[428px] mx-auto"
        style={{
          minHeight: `calc(56px + env(safe-area-inset-bottom, 0px))`,
        }}
      >
        {/* Icon Row - Platzhalter */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-[#D08945] transition-colors"
            aria-label="Bild hinzufügen"
          >
            <ImagePlus className="w-5 h-5" />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Was möchtest du teilen?"
          className="flex-1 bg-transparent outline-none resize-none text-gray-900 placeholder-gray-400 overflow-y-auto scrollbar-hide"
          style={{
            fontSize: "16px", // Verhindert automatisches Zoomen auf iOS
            minHeight: "24px",
            maxHeight: "120px",
            lineHeight: "1.5",
          }}
          rows={1}
        />

        {/* Post Button */}
        <button
          type="submit"
          disabled={!content.trim()}
          className="px-4 py-2 bg-[#D08945] text-white rounded-full font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#C07835] flex-shrink-0"
        >
          Posten
        </button>
      </form>
    </div>
  );
}

