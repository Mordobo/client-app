import type { User } from '@/contexts/AuthContext';
import { ApiError, loginWithApple, type AppleLoginPayload } from '@/services/auth';
import { mapAuthResponseToUser, type AppleProfile } from '@/utils/authMapping';
import { Platform } from 'react-native';

export interface AppleAuthCreds {
  identityToken: string;
  authorizationCode?: string;
  email?: string | null;
  fullName?: { givenName?: string | null; familyName?: string | null; name?: string | null } | null;
  user?: string; // Apple user identifier (sub)
}

/** Check if Apple Sign-In is available (iOS 13+ only; not on Android/Web by default). */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const { default: AppleAuth } = await import('expo-apple-authentication');
    return await AppleAuth.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Trigger native Apple Sign-In. Returns creds for loginOrRegisterWithApple, or null if cancelled/unavailable.
 */
export async function signInWithApple(): Promise<AppleAuthCreds | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const AppleAuth = (await import('expo-apple-authentication')).default;
    if (!(await AppleAuth.isAvailableAsync())) return null;
    const credential = await AppleAuth.signInAsync({
      requestedScopes: [
        AppleAuth.AppleAuthenticationScope.FULL_NAME,
        AppleAuth.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) return null;
    const creds: AppleAuthCreds = {
      identityToken: credential.identityToken,
      authorizationCode: credential.authorizationCode ?? undefined,
      email: credential.email ?? null,
      fullName: credential.fullName
        ? {
            givenName: credential.fullName.givenName ?? null,
            familyName: credential.fullName.familyName ?? null,
            name: [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ').trim() || undefined,
          }
        : null,
      user: credential.user,
    };
    return creds;
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED') return null;
    throw e;
  }
}

/**
 * Build Apple profile from credential for mapping (same shape as GoogleProfile).
 */
function buildAppleProfile(creds: AppleAuthCreds): AppleProfile {
  const fullName = creds.fullName;
  const name = fullName?.name ?? [fullName?.givenName, fullName?.familyName].filter(Boolean).join(' ').trim();
  const email = (creds.email ?? '').trim() || `apple-${creds.user ?? 'user'}@placeholder.apple`;
  return {
    id: creds.user ?? email,
    email,
    name: name || undefined,
    givenName: fullName?.givenName ?? undefined,
    familyName: fullName?.familyName ?? undefined,
    photo: undefined,
  };
}

/**
 * Login or register with Apple (backend finds or creates user). Returns User for AuthContext.
 */
export async function signInWithAppleAndLogin(creds: AppleAuthCreds): Promise<User> {
  const payload: AppleLoginPayload = {
    identityToken: creds.identityToken,
    authorizationCode: creds.authorizationCode,
    email: creds.email?.trim() || undefined,
    fullName: fullNameFromApple(creds.fullName),
  };
  const response = await loginWithApple(payload);
  const profile = buildAppleProfile(creds);
  return mapAuthResponseToUser(response, profile, 'apple');
}

function fullNameFromApple(
  fullName?: { givenName?: string | null; familyName?: string | null; name?: string | null } | null
): string | undefined {
  if (!fullName) return undefined;
  const n = fullName.name?.trim();
  if (n) return n;
  const parts = [fullName.givenName, fullName.familyName].filter(Boolean).join(' ').trim();
  return parts || undefined;
}

/**
 * Try Apple login/register; on 404 or missing endpoint fallback to error (no local fallback like Google).
 */
export async function loginOrRegisterWithApple(creds: AppleAuthCreds): Promise<User> {
  try {
    return await signInWithAppleAndLogin(creds);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      // Backend may not have /auth/apple; try again - backend now implements find-or-create so 404 is rare
      throw new ApiError('Apple sign-in not available', 404);
    }
    throw error;
  }
}
