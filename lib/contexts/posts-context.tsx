"use client";

import React, { createContext, useContext, useRef, useCallback } from "react";

interface PostsCacheContextType {
  setPosts: (key: string, posts: any[]) => void;
  getPosts: (key: string) => any[] | undefined;
  clearCache: () => void;
  /**
   * Fügt einen neuen Beitrag oben in alle gecachten Feeds der angegebenen Feed-Typen ein.
   * So erscheint ein frisch erstellter Beitrag beim Feed-Typ-Wechsel sofort (ohne Skeleton
   * und ohne "Hereinpoppen"), aber nur in Feeds, in denen er auch wirklich vorkommt.
   */
  prependPost: (post: any, feedTypes: string[]) => void;
  /**
   * Entfernt einen Beitrag aus allen gecachten Feeds. So verschwindet ein gelöschter
   * Beitrag beim Feed-Typ-Wechsel nicht erst sichtbar (kein "Herauspoppen").
   */
  removePost: (postId: string) => void;
  /**
   * Aktualisiert Like-Status und -Anzahl eines Beitrags in allen gecachten Feeds.
   * So ist ein Like beim Feed-Typ-Wechsel sofort korrekt (Herz + Zahl), ohne Umspringen.
   */
  updatePostLike: (postId: string, isLiked: boolean, likesDelta: number) => void;
  /**
   * Aktualisiert die Kommentaranzahl eines Beitrags in allen gecachten Feeds.
   * So stimmt die Kommentarzahl beim Feed-Typ-Wechsel sofort, ohne Umspringen.
   */
  updatePostCommentCount: (postId: string, delta: number) => void;
  /**
   * In-Memory-Marker (überlebt SPA-Navigation, wird bei vollständigem Reload zurückgesetzt):
   * Ob ein Feed-Typ in dieser Laufzeit-Session bereits geladen wurde.
   * -> Nach echtem Reload erscheint beim ersten Öffnen wieder ein Skeleton,
   *    beim Zurückkehren via In-App-Navigation dagegen nicht.
   */
  hasLoadedThisSession: (key: string) => boolean;
  markLoadedThisSession: (key: string) => void;
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

  // In-Memory Marker "in dieser Laufzeit schon geladen" – NICHT persistiert.
  // Überlebt SPA-Navigation (Provider bleibt gemountet), wird bei echtem Reload zurückgesetzt.
  const loadedKeysRef = useRef<Set<string>>(new Set());

  const hasLoadedThisSession = useCallback((key: string) => loadedKeysRef.current.has(key), []);
  const markLoadedThisSession = useCallback((key: string) => {
    loadedKeysRef.current.add(key);
  }, []);

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

  const prependPost = useCallback((post: any, feedTypes: string[]) => {
    if (!post || !post._id) return;
    // Cache-Key-Format: posts_${feedType}_${rankingMode}_${userId}
    postsCacheRef.current.forEach((entry, key) => {
      const matches = feedTypes.some((ft) => key.startsWith(`posts_${ft}_`));
      if (!matches) return;
      // Doppelte vermeiden
      if (entry.posts.some((p: any) => p._id === post._id)) return;
      setPosts(key, [post, ...entry.posts]);
    });
  }, [setPosts]);

  const removePost = useCallback((postId: string) => {
    if (!postId) return;
    postsCacheRef.current.forEach((entry, key) => {
      if (!entry.posts.some((p: any) => p._id === postId)) return;
      setPosts(key, entry.posts.filter((p: any) => p._id !== postId));
    });
  }, [setPosts]);

  const updatePostLike = useCallback((postId: string, isLiked: boolean, likesDelta: number) => {
    if (!postId) return;
    postsCacheRef.current.forEach((entry, key) => {
      let changed = false;
      const updated = entry.posts.map((p: any) => {
        if (p._id !== postId) return p;
        changed = true;
        return {
          ...p,
          isLiked,
          likesCount: Math.max(0, (p.likesCount ?? 0) + likesDelta),
        };
      });
      if (changed) setPosts(key, updated);
    });
  }, [setPosts]);

  const updatePostCommentCount = useCallback((postId: string, delta: number) => {
    if (!postId) return;
    postsCacheRef.current.forEach((entry, key) => {
      let changed = false;
      const updated = entry.posts.map((p: any) => {
        if (p._id !== postId) return p;
        changed = true;
        return { ...p, commentsCount: Math.max(0, (p.commentsCount ?? 0) + delta) };
      });
      if (changed) setPosts(key, updated);
    });
  }, [setPosts]);

  return (
    <PostsCacheContext.Provider value={{ setPosts, getPosts, clearCache, prependPost, removePost, updatePostLike, updatePostCommentCount, hasLoadedThisSession, markLoadedThisSession }}>
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




