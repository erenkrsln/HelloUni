"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AppInitializationContextType {
  isInitializing: boolean;
  setInitialized: () => void;
}

const AppInitializationContext = createContext<AppInitializationContextType | undefined>(undefined);

export function AppInitializationProvider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(() => {
    if (typeof window !== "undefined") {
      const hasInitialized = sessionStorage.getItem("appInitialized");
      return hasInitialized !== "true";
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasInitialized = sessionStorage.getItem("appInitialized");
      if (hasInitialized === "true") {
        setIsInitializing(false);
      }
    }
  }, []);

  const setInitialized = () => {
    setIsInitializing(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("appInitialized", "true");
    }
  };

  return (
    <AppInitializationContext.Provider value={{ isInitializing, setInitialized }}>
      {children}
    </AppInitializationContext.Provider>
  );
}

export function useAppInitialization() {
  const context = useContext(AppInitializationContext);
  if (!context) {
    throw new Error("useAppInitialization must be used within AppInitializationProvider");
  }
  return context;
}

