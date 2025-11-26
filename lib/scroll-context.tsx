"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { usePathname } from "next/navigation";

interface ScrollContextType {
  isHeaderVisible: boolean;
}

const ScrollContext = createContext<ScrollContextType>({ isHeaderVisible: true });

export function ScrollProvider({ children }: { children: ReactNode }) {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const pathname = usePathname();
  const isFeedPage = pathname === "/feed";

  useEffect(() => {
    if (!isFeedPage) {
      setIsHeaderVisible(true);
      return;
    }

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const mainElement = document.querySelector("main");
          if (!mainElement) {
            ticking = false;
            return;
          }
          
          const currentScrollY = mainElement.scrollTop;
          const scrollThreshold = 30;
          
          if (currentScrollY > scrollThreshold && currentScrollY > lastScrollY.current) {
            setIsHeaderVisible(false);
          } else if (currentScrollY < lastScrollY.current || currentScrollY <= scrollThreshold) {
            setIsHeaderVisible(true);
          }
          
          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    const mainElement = document.querySelector("main");
    if (mainElement) {
      mainElement.addEventListener("scroll", handleScroll, { passive: true });
      return () => mainElement.removeEventListener("scroll", handleScroll);
    }
  }, [isFeedPage]);

  return (
    <ScrollContext.Provider value={{ isHeaderVisible }}>
      {children}
    </ScrollContext.Provider>
  );
}

export function useScroll() {
  return useContext(ScrollContext);
}

