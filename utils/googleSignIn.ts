import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

if (typeof WebBrowser.maybeCompleteAuthSession === 'function') {
    WebBrowser.maybeCompleteAuthSession();
}
import type { GetTokensResponse } from '@react-native-google-signin/google-signin';
import { t } from '@/i18n';

const logWarning = (key: string, ...args: unknown[]) => {
  console.warn(t(key), ...args);
};

/*
 * We require the Google Sign-In module lazily so the app can run on platforms
 * or builds where the native module is not bundled (e.g. Expo Go or dev builds
 * sin el plugin). When the module is missing we return null and the callers can
 * fallback gracefully instead of crashing at import time.
 */

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

let cachedModule: GoogleSignInModule | null | undefined;

export const getGoogleSignInModule = (): GoogleSignInModule | null => {
  if (cachedModule === undefined) {
    try {
      cachedModule = require('@react-native-google-signin/google-signin');
    } catch (error) {
      logWarning('warnings.googleSignInModuleUnavailable', error);
      cachedModule = null;
    }
  }

  return cachedModule ?? null;
};

export const getGoogleSignin = () => getGoogleSignInModule()?.GoogleSignin ?? null;
export const getGoogleStatusCodes = () => getGoogleSignInModule()?.statusCodes ?? null;
export const isGoogleSignInAvailable = () => getGoogleSignInModule() !== null;

export type GoogleStatusCodes = typeof import('@react-native-google-signin/google-signin')['statusCodes'];
export type GoogleGetTokensResponse = GetTokensResponse;

const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const USER_INFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';
const WEB_OAUTH_WINDOW_NAME = 'google-oauth';

const getWebClientId = () => process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
const WEB_STATE_STORAGE_KEY = 'google-web-oauth-state';
export const WEB_RESULT_STORAGE_KEY = 'google-web-oauth-result';

const storeWebState = (state: string) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(WEB_STATE_STORAGE_KEY, state);
  } catch (error) {
    logWarning('warnings.googleSignInWebPersistStateFailed', error);
  }
};

const readWebState = (): string | null => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  try {
    return window.sessionStorage.getItem(WEB_STATE_STORAGE_KEY);
  } catch (error) {
    logWarning('warnings.googleSignInWebReadStateFailed', error);
    return null;
  }
};

const clearWebState = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.removeItem(WEB_STATE_STORAGE_KEY);
  } catch (error) {
    logWarning('warnings.googleSignInWebClearStateFailed', error);
  }
};

const storeWebResult = (result: GoogleWebSignInResult) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(
      WEB_RESULT_STORAGE_KEY,
      JSON.stringify({
        result,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    logWarning('warnings.googleSignInWebPersistResultFailed', error);
  }
};

const consumeStoredWebResult = (): GoogleWebSignInResult | null => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(WEB_RESULT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    window.localStorage.removeItem(WEB_RESULT_STORAGE_KEY);
    const parsed = JSON.parse(raw) as { result?: GoogleWebSignInResult } | null;
    if (parsed && parsed.result) {
      return parsed.result;
    }
  } catch (error) {
    logWarning('warnings.googleSignInWebReadResultFailed', error);
  }
  return null;
};

const clearLocationAuthHash = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }
  try {
    const baseUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, document.title, baseUrl || '/');
  } catch (error) {
    logWarning('warnings.googleSignInWebClearHashFailed', error);
  }
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = typeof atob === 'function' ? atob(padded) : Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (error) {
    logWarning('warnings.googleSignInWebDecodeIdTokenFailed', error);
    return null;
  }
};

const fetchUserInfo = async (accessToken: string | undefined, idToken: string) => {
  if (accessToken) {
    try {
      const response = await fetch(USER_INFO_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.ok) {
        return (await response.json()) as Record<string, unknown>;
      }
    } catch (error) {
      logWarning('warnings.googleSignInWebFetchUserInfoFailed', error);
    }
  }
  return decodeJwtPayload(idToken) ?? {};
};

export const isGoogleWebAvailable = () => {
  if (Platform.OS !== 'web') {
    return false;
  }
  const available = !!getWebClientId();
  console.log('[GoogleSignIn] isGoogleWebAvailable ->', available, 'Platform:', Platform.OS);
  return available;
};

export interface GoogleWebSignInResult {
  idToken: string;
  accessToken?: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    givenName: string | null;
    familyName: string | null;
    photo: string | null;
  };
}

const mapProfileToWebResult = (
  idToken: string,
  accessToken: string | undefined,
  profile: Record<string, unknown>
): GoogleWebSignInResult => {
  const id = String(profile?.sub ?? profile?.id ?? '');
  const email = String(profile?.email ?? '');
  const name = (profile?.name as string | undefined) ?? null;
  const givenName = (profile?.given_name as string | undefined) ?? null;
  const familyName = (profile?.family_name as string | undefined) ?? null;
  const photo = (profile?.picture as string | undefined) ?? null;

  return {
    idToken,
    accessToken,
    user: {
      id,
      email,
      name,
      givenName,
      familyName,
      photo,
    },
  };
};

const initialWebHashSnapshot =
  Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hash : null;
let hasConsumedInitialHashSnapshot = false;

export const consumePendingGoogleWebResult = async (): Promise<GoogleWebSignInResult | null> => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  let hash = window.location.hash;
  console.log('[GoogleSignIn][web] Checking for pending OAuth result', hash);

  if (!hash || hash.length <= 1) {
    if (!hasConsumedInitialHashSnapshot && initialWebHashSnapshot && initialWebHashSnapshot.length > 1) {
      console.log('[GoogleSignIn][web] Using initial hash snapshot captured at module load.');
      hash = initialWebHashSnapshot;
      hasConsumedInitialHashSnapshot = true;
    } else {
      console.log('[GoogleSignIn][web] No hash found in URL. Nothing to consume.');
      const storedResult = consumeStoredWebResult();
      if (storedResult) {
        console.log('[GoogleSignIn][web] Retrieved stored OAuth result from localStorage.');
      }
      return storedResult;
    }
  } else if (!hasConsumedInitialHashSnapshot) {
    hasConsumedInitialHashSnapshot = true;
  }

  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const hasRelevantParams =
    params.has('id_token') || params.has('access_token') || params.has('error');

  if (!hasRelevantParams) {
    console.log('[GoogleSignIn][web] Hash does not contain OAuth tokens.', {
      params: hash,
    });
    return consumeStoredWebResult();
  }

  const storedState = readWebState();
  const returnedState = params.get('state');

  if (storedState && returnedState && returnedState !== storedState) {
    clearWebState();
    clearLocationAuthHash();
    throw new Error('google-web-state-mismatch');
  }

  const authError = params.get('error');
  if (authError) {
    clearWebState();
    clearLocationAuthHash();
    if (authError === 'access_denied') {
      throw new Error('google-web-signin-cancelled');
    }
    throw new Error(params.get('error_description') || authError);
  }

  const idToken = params.get('id_token');
  if (!idToken) {
    clearWebState();
    clearLocationAuthHash();
    throw new Error('google-web-missing-id-token');
  }

  const accessToken = params.get('access_token') ?? undefined;

  console.log('[GoogleSignIn][web] OAuth hash parsed. Building result payload.', {
    hasAccessToken: !!accessToken,
    hasIdToken: !!idToken,
  });

  clearWebState();
  clearLocationAuthHash();

  const profile = await fetchUserInfo(accessToken, idToken);
  const result = mapProfileToWebResult(idToken, accessToken, profile);
  const isPopupWindow = typeof window !== 'undefined' && window.name === WEB_OAUTH_WINDOW_NAME;

  if (isPopupWindow) {
    storeWebResult(result);
    console.log('[GoogleSignIn][web] OAuth result stored in popup. Awaiting main window consumption.');
    try {
      window.close();
    } catch (error) {
      logWarning('warnings.googleSignInWebClosePopupFailed', error);
    }
    return null;
  }

  return result;
};

export const signInWithGoogleWeb = async (): Promise<GoogleWebSignInResult | null> => {
  if (Platform.OS !== 'web') {
    throw new Error('google-web-not-supported');
  }

  const clientId = getWebClientId();
  if (!clientId) {
    throw new Error('google-missing-web-client-id');
  }

  const resolveRedirectUri = () => {
    if (typeof window === 'undefined') {
      throw new Error('google-web-no-window');
    }
    const origin = window.location.origin ?? '';
    const redirectPath = process.env.EXPO_PUBLIC_GOOGLE_WEB_REDIRECT_PATH?.trim();
    if (redirectPath) {
      const normalizedPath = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;
      return `${origin}${normalizedPath}`;
    }
    return origin;
  };

  const redirectUri = resolveRedirectUri();
  const state = Math.random().toString(36).slice(2);

  storeWebState(state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token id_token',
    scope: 'openid profile email',
    state,
    nonce: state,
  });

  const authUrl = `${AUTHORIZATION_ENDPOINT}?${params.toString()}`;

  const popupFeatures = 'width=500,height=700,menubar=no,toolbar=no,status=no,resizable=yes,scrollbars=yes';
  const popup = window.open(authUrl, WEB_OAUTH_WINDOW_NAME, popupFeatures);

  if (!popup) {
    logWarning('warnings.googleSignInWebPopupBlocked');
    window.location.href = authUrl;
  }

  return null;
};
