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
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const base = API_BASE.replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}
