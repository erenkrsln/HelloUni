"use client";

import { useEffect } from "react";

/**
 * Komponente zum Entfernen aller registrierten Service Worker
 * Verhindert Fehler durch alte oder externe Service Worker (z.B. von Browser-Extensions)
 */
export function UnregisterServiceWorkers() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch((error) => {
            console.warn("Service Worker unregister error:", error);
          });
        }
      });
    }
  }, []);

  return null;
}

