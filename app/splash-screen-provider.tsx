"use client";

import { useEffect, useState } from "react";
import { useAppInitialization } from "@/lib/app-initialization-context";
import { SplashScreen } from "@/components/splash-screen";

export function SplashScreenProvider({ children }: { children: React.ReactNode }) {
  const { isInitializing } = useAppInitialization();
  const [showSplash, setShowSplash] = useState(true);
  const [canRenderContent, setCanRenderContent] = useState(false);

  useEffect(() => {
    if (!isInitializing) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        setTimeout(() => {
          setCanRenderContent(true);
        }, 100);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowSplash(true);
      setCanRenderContent(false);
    }
  }, [isInitializing]);

  return (
    <>
      {showSplash && <SplashScreen />}
      {canRenderContent ? children : null}
    </>
  );
}

