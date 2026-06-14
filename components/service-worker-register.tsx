"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker (/sw.js) once, app-wide.
 * Required for installability and for receiving Web Push while the app is closed.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("[pwa] service worker registration failed", err));
  }, []);

  return null;
}
