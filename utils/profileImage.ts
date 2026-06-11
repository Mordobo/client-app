import { API_BASE } from '@/utils/apiConfig';

/**
 * Default placeholder image for provider/client avatars when no profile image is set.
 * Single source of truth so all screens show the same placeholder.
 */
export const DEFAULT_AVATAR_URI = 'https://via.placeholder.com/96?text=👤';

/**
 * True when the URL host only works on a dev machine / emulator, not on a physical device
 * or after the app points at another API (QA/prod).
 */
function isDevLoopbackHostname(hostname: string): boolean {
  return /^(localhost|127\.0\.0\.1)$/i.test(hostname) || hostname === '10.0.2.2';
}

/**
 * Rewrites absolute profile image URLs that point at this app's API /uploads/ path
 * (or loopback dev hosts) to the current API_BASE so avatars load on QA/prod and real devices.
 */
function rewriteAbsoluteProfileUrl(trimmed: string): string {
  try {
    const parsed = new URL(trimmed);
    const isLoopback = isDevLoopbackHostname(parsed.hostname);
    const isApiUpload = parsed.pathname.includes('/uploads/');
    if (!isLoopback && !isApiUpload) return trimmed;
    const origin = API_BASE.replace(/\/$/, '');
    return `${origin}${parsed.pathname}${parsed.search}`;
  } catch {
    return trimmed;
  }
}

/**
 * Normalizes a profile image URL from the API.
 * - If url is null/empty, returns null.
 * - If url is data URI or already absolute (http/https), returns as-is.
 * - If url is relative (e.g. uploads/providers/...), returns absolute URL using API_BASE
 *   so the same image loads on Home, Chat list, and Chat header.
 */
export function getProfileImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  // Never treat local device paths as remote URLs (would produce invalid https://api/.../file://... URLs)
  if (trimmed.startsWith('file:')) return null;
  if (trimmed.startsWith('data:')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return rewriteAbsoluteProfileUrl(trimmed);
  }
  const base = API_BASE.replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}
