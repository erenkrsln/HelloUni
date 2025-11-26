"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registriert:", registration.scope);
            
            // Prüfe auf Updates
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    // Neuer Service Worker verfügbar
                    console.log("Neuer Service Worker verfügbar");
                    // Optional: Zeige Benachrichtigung zum Aktualisieren
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.error("Service Worker Registrierung fehlgeschlagen:", error);
          });
      });
    }
  }, []);

  return null;
}

