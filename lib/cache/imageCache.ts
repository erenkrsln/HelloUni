/**
 * Globaler Cache für geladene Bilder - persistiert über alle Component-Instanzen hinweg
 * Wird von FeedCard, ProfileHeader und anderen Komponenten verwendet
 * Verhindert Neuladen von Bildern bei Navigation
 */
export const globalLoadedImagesCache = new Set<string>();

const storageIdToUrlCache = new Map<string, string[]>();

function extractStorageId(url: string): string | null {
  const match = url.match(/\/api\/storage\/([^/?]+)/);
  return match ? match[1] : null;
}

/**
 * Prüft, ob ein Bild bereits im Cache ist oder im Browser-Cache vorhanden ist
 * @param imageUrl Die URL des Bildes
 * @returns true wenn das Bild bereits geladen ist
 */
export function isImageLoaded(imageUrl: string | null | undefined): boolean {
  if (!imageUrl) return true; // Wenn kein Bild, sofort als geladen markieren
  
  // Prüfe globalen Cache
  if (globalLoadedImagesCache.has(imageUrl)) return true;
  
  const storageId = extractStorageId(imageUrl);
  if (storageId) {
    const cachedUrls = storageIdToUrlCache.get(storageId);
    if (cachedUrls && cachedUrls.length > 0) {
      globalLoadedImagesCache.add(imageUrl);
      if (!cachedUrls.includes(imageUrl)) {
        cachedUrls.push(imageUrl);
      }
      return true;
    }
  }
  
  // Prüfe Browser-Cache für die aktuelle URL
  if (typeof window !== 'undefined') {
    try {
      const img = new window.Image();
      img.src = imageUrl;
      // Prüfe, ob das Bild bereits geladen ist (im Browser-Cache)
      if (img.complete && img.naturalWidth > 0) {
        globalLoadedImagesCache.add(imageUrl);
        if (storageId) {
          const cachedUrls = storageIdToUrlCache.get(storageId) || [];
          if (!cachedUrls.includes(imageUrl)) {
            cachedUrls.push(imageUrl);
          }
          storageIdToUrlCache.set(storageId, cachedUrls);
        }
        return true;
      }
    } catch (e) {
      // Ignoriere Fehler bei der Browser-Cache-Prüfung
    }
  }
  
  return false;
}

/**
 * Markiert ein Bild als geladen im Cache
 * @param imageUrl Die URL des Bildes
 */
export function markImageAsLoaded(imageUrl: string | null | undefined): void {
  if (imageUrl) {
    globalLoadedImagesCache.add(imageUrl);
    const storageId = extractStorageId(imageUrl);
    if (storageId) {
      const cachedUrls = storageIdToUrlCache.get(storageId) || [];
      if (!cachedUrls.includes(imageUrl)) {
        cachedUrls.push(imageUrl);
      }
      storageIdToUrlCache.set(storageId, cachedUrls);
    }
  }
}

