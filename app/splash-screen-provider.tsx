"use client";

import { useEffect, useState } from "react";
import { useAppInitialization } from "@/lib/app-initialization-context";
import { SplashScreen } from "@/components/splash-screen";

export function SplashScreenProvider({ children }: { children: React.ReactNode }) {
  const { isInitializing } = useAppInitialization();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!isInitializing) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setShowSplash(true);
    }
  }, [isInitializing]);

  return (
    <>
      {showSplash && <SplashScreen />}
      {children}
    </>
  );
}

