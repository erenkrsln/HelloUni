/** Gibt true zurück wenn der Nutzer gerade einen Desktop-Browser nutzt. */
export function isDesktop(): boolean {
  return typeof window !== "undefined" && window.innerWidth >= 768;
}

/**
 * Öffnet den Anruf als separates Browser-Popup-Fenster (WhatsApp Web-Stil).
 * Video: 800×600 px | Audio: 400×450 px – jeweils zentriert auf dem Bildschirm.
 * Nur für Desktop gedacht – auf Mobile bitte isDesktop() prüfen.
 */
export function openCallWindow(callId: string, type: "voice" | "video") {
  const w = type === "video" ? 1280 : 520;
  const h = type === "video" ? 800 : 700;
  const left = Math.round(window.screen.availLeft + (window.screen.availWidth - w) / 2);
  const top = Math.round(window.screen.availTop + (window.screen.availHeight - h) / 2);
  window.open(
    `/call/${callId}?type=${type}`,
    `hellounii_call_${callId}`,
    `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`
  );
}
