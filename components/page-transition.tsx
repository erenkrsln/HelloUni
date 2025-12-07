"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, ReactNode, useRef } from "react";
import { useNavigation } from "./navigation-context";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * PageTransition-Komponente verhindert das Überlappen von Routen beim Navigation-Wechsel
 * Blendet die alte Seite sofort aus und zeigt die neue erst an, wenn sie bereit ist
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const { isNavigating, setIsNavigating } = useNavigation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousPathname = useRef(pathname);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Wenn sich der Pfad ändert, starte Transition sofort
    if (pathname !== previousPathname.current && mountedRef.current) {
      // Alte Seite sofort ausblenden
      setIsTransitioning(true);
      setIsNavigating(true);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Nach kurzer Verzögerung die neue Seite anzeigen
      // Dies gibt Next.js Zeit, die neue Seite zu rendern
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setIsTransitioning(false);
          setIsNavigating(false);
          previousPathname.current = pathname;
        }
      }, 150); // Kurze Verzögerung für flüssigen Übergang

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [pathname, setIsNavigating]);

  return (
    <div
      style={{
        opacity: isTransitioning ? 0 : 1,
        transition: isTransitioning ? "opacity 0.08s ease-out" : "opacity 0.12s ease-in",
        pointerEvents: isTransitioning ? "none" : "auto",
        willChange: "opacity",
        minHeight: "100vh", // Verhindert Layout-Shift
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}

