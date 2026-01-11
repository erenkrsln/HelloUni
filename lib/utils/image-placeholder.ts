/**
 * Generiert einen SVG-basierten Shimmer-Effekt als Base64-String
 * für die Verwendung als blurDataURL in Next.js Image Komponenten
 * 
 * @param width - Breite des Placeholders (Standard: 400)
 * @param height - Höhe des Placeholders (Standard: 300)
 * @returns Base64-kodierter SVG-String für placeholder="blur"
 */
export function generateShimmerBlurDataUrl(
  width: number = 400,
  height: number = 300
): string {
  const shimmer = `
    <svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="shimmer-gradient">
          <stop stop-color="#f3f4f6" offset="20%" />
          <stop stop-color="#e5e7eb" offset="50%" />
          <stop stop-color="#f3f4f6" offset="70%" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="#f3f4f6" />
      <rect id="shimmer-rect" width="${width}" height="${height}" fill="url(#shimmer-gradient)" opacity="0.5" />
    </svg>`;

  const toBase64 = (str: string) =>
    typeof window === 'undefined'
      ? Buffer.from(str).toString('base64')
      : window.btoa(unescape(encodeURIComponent(str)));

  return `data:image/svg+xml;base64,${toBase64(shimmer)}`;
}

/**
 * Standard-Shimmer für verschiedene Aspect Ratios
 */
export const SHIMMER_PLACEHOLDERS = {
  square: generateShimmerBlurDataUrl(400, 400),
  video: generateShimmerBlurDataUrl(400, 225), // 16:9
  portrait: generateShimmerBlurDataUrl(300, 400),
  landscape: generateShimmerBlurDataUrl(600, 400),
} as const;

