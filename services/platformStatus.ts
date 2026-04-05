import { API_BASE } from '@/utils/apiConfig';

export interface PlatformStatusResponse {
  maintenance_mode: boolean;
}

/**
 * Public endpoint: no auth. Used to show maintenance UI before login.
 */
export async function fetchPlatformStatus(): Promise<PlatformStatusResponse> {
  const url = `${API_BASE}/api/platform/status`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error('platform_status_failed');
  }
  const data = (await response.json()) as unknown;
  if (typeof data !== 'object' || data === null || !('maintenance_mode' in data)) {
    throw new Error('platform_status_invalid');
  }
  return {
    maintenance_mode: Boolean((data as { maintenance_mode: unknown }).maintenance_mode),
  };
}
