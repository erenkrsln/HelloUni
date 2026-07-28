"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

/**
 * Synchronisiert das in Convex gespeicherte Theme mit next-themes.
 * 
 * Ablauf:
 * 1. Beim App-Start liest next-themes den localStorage (kein Flash).
 * 2. Sobald Convex geladen hat, wird das serverseitig gespeicherte Theme angewendet.
 * 3. Das Convex-Theme hat Priorität über den localStorage-Wert.
 * 
 * Rendert nichts – reine Sync-Logik.
 */
export function ThemeSync() {
  const { setTheme } = useTheme();
  const { session } = useCurrentUser();
  const email = session?.user?.email;

  const serverTheme = useQuery(
    api.settings.getUserTheme,
    email ? { email } : "skip"
  );

  // Nur einmal beim initialen Laden synchronisieren,
  // danach hat die lokale Auswahl Vorrang (bis zum nächsten App-Start).
  const hasSynced = useRef(false);

  useEffect(() => {
    if (hasSynced.current) return;
    if (serverTheme === undefined) return; // Noch am Laden
    if (serverTheme === null) return; // Kein Theme gespeichert

    setTheme(serverTheme);
    hasSynced.current = true;
  }, [serverTheme, setTheme]);

  return null;
}
