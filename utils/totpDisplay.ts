/**
 * Raw base32 secret for manual entry in authenticator apps (no spaces).
 */
export function getTotpManualEntryRaw(setup: {
  manualEntryKey?: string;
  secret?: string;
} | null): string {
  if (!setup) return '';
  const raw = (setup.manualEntryKey ?? setup.secret ?? '').replace(/\s/g, '').toUpperCase();
  return raw;
}

/**
 * Spaces every 4 characters for on-screen readability only.
 */
export function formatTotpSecretForDisplay(secret: string): string {
  const cleaned = secret.replace(/\s/g, '').toUpperCase();
  if (!cleaned) return '';
  const chunks = cleaned.match(/.{1,4}/g);
  return chunks ? chunks.join(' ') : cleaned;
}
