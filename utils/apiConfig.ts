import { Platform } from 'react-native';

/** API environment: localhost | qa | production. Default: qa (Render cloud) when unset. */
const API_ENV_VALUES = ['localhost', 'qa', 'production'] as const;
export type ApiEnv = (typeof API_ENV_VALUES)[number];

const DEFAULT_QA_URL = 'https://mordobo-api-qa.onrender.com';
const DEFAULT_PROD_URL = 'https://api.mordobo.com';

/**
 * Centralized API configuration.
 *
 * Default: **qa** → Render (`DEFAULT_QA_URL`) so app and backoffice align with cloud API unless you opt out.
 *
 * Set `EXPO_PUBLIC_API_ENV` in `.env`:
 * - `localhost` → http://localhost:3000 (10.0.2.2:3000 on Android emulator)
 * - `qa` → `EXPO_PUBLIC_API_URL` or default QA Render URL
 * - `production` → `EXPO_PUBLIC_API_URL_PROD` or default production URL
 */
const sanitizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

function getApiEnv(): ApiEnv {
  const raw = process.env.EXPO_PUBLIC_API_ENV?.trim().toLowerCase();
  if (raw === 'localhost' || raw === 'qa' || raw === 'production') {
    return raw;
  }
  return 'qa';
}

function resolveUrlForEnv(env: ApiEnv): string {
  if (env === 'localhost') {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }
  if (env === 'qa') {
    const url = process.env.EXPO_PUBLIC_API_URL?.trim();
    if (url?.length) {
      return url;
    }
    return DEFAULT_QA_URL;
  }
  // production
  const url = process.env.EXPO_PUBLIC_API_URL_PROD?.trim();
  if (url?.length) {
    return url;
  }
  return DEFAULT_PROD_URL;
}

const getHost = (): string => {
  const env = getApiEnv();
  let url = resolveUrlForEnv(env);
  if (Platform.OS === 'android' && /localhost|127\.0\.0\.1/i.test(url)) {
    url = url.replace(/(localhost|127\.0\.0\.1)/gi, '10.0.2.2');
  }
  return url;
};

/** Current API environment (localhost | qa | production). */
export const API_ENV = getApiEnv();

export const API_BASE = sanitizeBaseUrl(getHost());

export const getApiBaseUrl = () => API_BASE;

if (typeof console !== 'undefined') {
  const envRaw = process.env.EXPO_PUBLIC_API_ENV?.trim();
  console.log('[API Config] ========================================');
  console.log('[API Config] EXPO_PUBLIC_API_ENV:', envRaw || '(unset → qa / Render cloud)');
  console.log('[API Config] API_ENV:', API_ENV);
  console.log('[API Config] API_BASE:', API_BASE);
  console.log('[API Config] Platform:', Platform.OS);
  console.log('[API Config] ========================================');
}
