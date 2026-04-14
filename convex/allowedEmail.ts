/** Erlaubte Hochschul-E-Mail-Domain (TH Nürnberg). */
export const ALLOWED_EMAIL_DOMAIN = "th-nuernberg.de" as const;

export const ALLOWED_EMAIL_ERROR =
  "Nur E-Mail-Adressen der TH Nürnberg (@th-nuernberg.de) sind erlaubt.";

export function isAllowedUniversityEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at < 1) return false;
  const domain = normalized.slice(at + 1);
  return domain === ALLOWED_EMAIL_DOMAIN;
}
