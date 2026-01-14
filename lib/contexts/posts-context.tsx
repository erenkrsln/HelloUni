"use client";

import React, { createContext, useContext, useRef, useCallback } from "react";

interface PostsCacheContextType {
  setPosts: (key: string, posts: any[]) => void;
  getPosts: (key: string) => any[] | undefined;
  clearCache: () => void;
}

const PostsCacheContext = createContext<PostsCacheContextType | undefined>(undefined);

const CACHE_STORAGE_KEY = "hello_uni_posts_cache";
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 Minuten

/**
 * Globaler Posts Cache Provider
 * Speichert Posts in localStorage, damit sie auch nach App-Neustart verfügbar sind
 */
export function PostsCacheProvider({ children }: { children: React.ReactNode }) {
  // Lade Cache synchron beim ersten Render (nicht in useEffect, damit er sofort verfügbar ist)
  const loadCacheFromStorage = (): Map<string, { posts: any[]; timestamp: number }> => {
    const cache = new Map<string, { posts: any[]; timestamp: number }>();
    
    if (typeof window === "undefined") return cache;

    try {
      const stored = localStorage.getItem(CACHE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        
        // Lade nur nicht-abgelaufene Caches
        Object.entries(parsed).forEach(([key, value]: [string, any]) => {
          if (value && value.timestamp && (now - value.timestamp) < CACHE_EXPIRY_MS) {
            cache.set(key, value);
          }
        });
      }
    } catch (error) {
      console.error("Fehler beim Laden des Posts-Cache:", error);
    }
    
    return cache;
  };

  // In-Memory Cache für schnellen Zugriff - synchron geladen
  const postsCacheRef = useRef<Map<string, { posts: any[]; timestamp: number }>>(loadCacheFromStorage());

  const setPosts = useCallback((key: string, posts: any[]) => {
    const cacheEntry = {
      posts,
      timestamp: Date.now(),
    };
    
    // In-Memory Cache
    postsCacheRef.current.set(key, cacheEntry);

    // Persistiere in localStorage
    try {
      const stored = localStorage.getItem(CACHE_STORAGE_KEY);
      const cache = stored ? JSON.parse(stored) : {};
      cache[key] = cacheEntry;
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error("Fehler beim Speichern des Posts-Cache:", error);
    }
  }, []);

  const getPosts = useCallback((key: string) => {
    const cached = postsCacheRef.current.get(key);
    if (!cached) return undefined;

    // Prüfe, ob Cache abgelaufen ist
    const now = Date.now();
    if ((now - cached.timestamp) >= CACHE_EXPIRY_MS) {
      postsCacheRef.current.delete(key);
      // Entferne auch aus localStorage
      try {
        const stored = localStorage.getItem(CACHE_STORAGE_KEY);
        if (stored) {
          const cache = JSON.parse(stored);
          delete cache[key];
          localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
        }
      } catch (error) {
        // Ignoriere Fehler
      }
      return undefined;
    }

    return cached.posts;
  }, []);

  const clearCache = useCallback(() => {
    postsCacheRef.current.clear();
    try {
      localStorage.removeItem(CACHE_STORAGE_KEY);
    } catch (error) {
      console.error("Fehler beim Löschen des Posts-Cache:", error);
    }
  }, []);

  return (
    <PostsCacheContext.Provider value={{ setPosts, getPosts, clearCache }}>
      {children}
    </PostsCacheContext.Provider>
  );
}

export function usePostsCache() {
  const context = useContext(PostsCacheContext);
  if (context === undefined) {
    throw new Error("usePostsCache must be used within a PostsCacheProvider");
  }
  return context;
}




