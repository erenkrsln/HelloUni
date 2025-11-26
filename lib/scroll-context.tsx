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

    const handleScroll = () => {
      const mainElement = document.querySelector("main");
      if (!mainElement) return;
      
      const currentScrollY = mainElement.scrollTop;
      const scrollThreshold = 50;
      
      if (currentScrollY > scrollThreshold && currentScrollY > lastScrollY.current) {
        setIsHeaderVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setIsHeaderVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
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

