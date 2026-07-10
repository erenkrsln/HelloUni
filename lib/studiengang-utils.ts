import studiengangLinks from './studiengang-links.json';

const normalizeStudiengangName = (name: string) =>
  name.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

export function getStudiengangUrl(major: string): string {
  const normalized = normalizeStudiengangName(major);

  // Direct match
  if (studiengangLinks[normalized as keyof typeof studiengangLinks]) {
    return studiengangLinks[normalized as keyof typeof studiengangLinks];
  }

  // Case-insensitive fallback
  const match = Object.entries(studiengangLinks).find(
    ([key]) => normalizeStudiengangName(key).toLowerCase() === normalized.toLowerCase()
  );

  return match?.[1] || generateThUrlFallback(major);
}

function generateThUrlFallback(major: string): string {
  const slug = major.toLowerCase()
    .replace(/\s*\(b\.eng\.\)/g, '-beng')
    .replace(/\s*\(b\.a\.\)/g, '-ba')
    .replace(/\s*\(b\.sc\.\)/g, '-bsc')
    .replace(/\s*\(m\.eng\.\)/g, '-meng')
    .replace(/\s*\(m\.a\.\)/g, '-ma')
    .replace(/\s*\(m\.sc\.\)/g, '-msc')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `https://www.th-nuernberg.de/studiengang/${slug}/`;
}

export const getAllStudiengaenge = () => Object.keys(studiengangLinks).map(normalizeStudiengangName);