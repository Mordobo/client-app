import { Platform } from 'react-native';

import { API_BASE } from '@/utils/apiConfig';

/**
 * Default placeholder image for provider/client avatars when no profile image is set.
 * Single source of truth so all screens show the same placeholder.
 */
export const DEFAULT_AVATAR_URI = 'https://via.placeholder.com/96?text=👤';

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
  if (trimmed.startsWith('data:')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // Android emulator: API may store avatar as http://localhost/... which does not reach the host machine.
    if (Platform.OS === 'android') {
      try {
        const parsed = new URL(trimmed);
        if (/^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname)) {
          const origin = API_BASE.replace(/\/$/, '');
          return `${origin}${parsed.pathname}${parsed.search}`;
        }
      } catch {
        /* ignore malformed URL */
      }
    }
    return trimmed;
  }
  const base = API_BASE.replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}
