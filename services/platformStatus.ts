import { API_BASE } from '@/utils/apiConfig';

export interface PlatformStatusResponse {
  maintenance_mode: boolean;
  app_version?: string | null;
  backoffice_version?: string | null;
}

export const PLATFORM_STATUS_QUERY_KEY = ['platform-status'] as const;

function coerceMaintenanceBoolean(value: unknown): boolean {
  if (value === true || value === false) {
    return value;
  }
  if (value === 1 || value === 0) {
    return value === 1;
  }
  if (value === 'true' || value === 'false') {
    return value === 'true';
  }
  return false;
}

function parsePlatformStatusPayload(data: unknown): PlatformStatusResponse | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const record = data as Record<string, unknown>;
  if ('maintenance_mode' in record) {
    return {
      maintenance_mode: coerceMaintenanceBoolean(record.maintenance_mode),
      app_version:
        typeof record.app_version === 'string' || record.app_version == null
          ? (record.app_version as string | null | undefined)
          : undefined,
      backoffice_version:
        typeof record.backoffice_version === 'string' || record.backoffice_version == null
          ? (record.backoffice_version as string | null | undefined)
          : undefined,
    };
  }
  if ('maintenanceMode' in record) {
    return {
      maintenance_mode: coerceMaintenanceBoolean(record.maintenanceMode),
      app_version:
        typeof record.appVersion === 'string' || record.appVersion == null
          ? (record.appVersion as string | null | undefined)
          : undefined,
      backoffice_version:
        typeof record.backofficeVersion === 'string' || record.backofficeVersion == null
          ? (record.backofficeVersion as string | null | undefined)
          : undefined,
    };
  }
  if ('data' in record) {
    return parsePlatformStatusPayload(record.data);
  }
  return null;
}

function isMaintenance503Payload(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  return String((data as { code?: unknown }).code) === 'maintenance_mode';
}

/**
 * Public endpoint: no auth. Used to show maintenance UI before login.
 */
export async function fetchPlatformStatus(): Promise<PlatformStatusResponse> {
  const url = `${API_BASE}/api/platform/status`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error('platform_status_failed');
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new Error('platform_status_invalid');
  }

  if (!response.ok) {
    if (response.status === 503 && isMaintenance503Payload(raw)) {
      return { maintenance_mode: true };
    }
    throw new Error('platform_status_failed');
  }

  const parsed = parsePlatformStatusPayload(raw);
  if (!parsed) {
    throw new Error('platform_status_invalid');
  }
  return parsed;
}
