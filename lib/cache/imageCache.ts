/**
 * Globaler Cache für geladene Bilder - persistiert über alle Component-Instanzen hinweg
 * Wird von FeedCard, ProfileHeader und anderen Komponenten verwendet
 * Verhindert Neuladen von Bildern bei Navigation
 */
export const globalLoadedImagesCache = new Set<string>();

/**
 * Cache für Storage-IDs (um auch bei sich ändernden URLs zu funktionieren)
 * Maps Storage-ID zu geladenen URLs
 */
const storageIdToUrlCache = new Map<string, string[]>();

/**
 * Extrahiert die Storage-ID aus einer Convex Storage URL
 * @param url Die URL
 * @returns Die Storage-ID oder null
 */
function extractStorageId(url: string): string | null {
  // Convex Storage URLs haben das Format: https://*.convex.cloud/api/storage/{storageId}
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
  
  // Prüfe, ob die Storage-ID bereits geladen wurde (auch mit anderer URL)
  const storageId = extractStorageId(imageUrl);
  if (storageId) {
    const cachedUrls = storageIdToUrlCache.get(storageId);
    if (cachedUrls && cachedUrls.length > 0) {
      // Wenn eine URL mit derselben Storage-ID bereits geladen wurde,
      // nehmen wir an, dass das Bild bereits im Browser-Cache ist
      // (auch wenn die URL sich geändert hat)
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
        // Speichere auch die Storage-ID
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
    
    // Speichere auch die Storage-ID für besseres Caching bei sich ändernden URLs
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

