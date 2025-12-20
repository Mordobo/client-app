import type { User } from '@/contexts/AuthContext';
import {
    ApiError,
    loginWithGoogle,
    registerUser,
    type AuthSuccessResponse,
    type GoogleLoginPayload,
} from '@/services/auth';
import { mapAuthResponseToUser, type GoogleProfile } from '@/utils/authMapping';

export interface GoogleAuthTokens {
  idToken?: string;
  accessToken?: string;
}

const sanitizePhoneCandidate = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) {
    return undefined;
  }
  if (digits.length < 10) {
    return digits.padEnd(10, '0').slice(0, 10);
  }
  return digits.slice(0, 15);
};

const buildPhoneFromProfile = (profile: GoogleProfile): string | undefined => {
  const recordProfile = profile as unknown as Record<string, unknown>;
  const directPhone =
    sanitizePhoneCandidate(recordProfile.phone as string | undefined) ??
    sanitizePhoneCandidate(recordProfile.phoneNumber as string | undefined);
  if (directPhone) {
    return directPhone;
  }

  const emailDigits = sanitizePhoneCandidate(profile.email);
  if (emailDigits) {
    return emailDigits;
  }

  const idDigits = sanitizePhoneCandidate(profile.id);
  if (idDigits) {
    return idDigits;
  }

  const source = profile.id || profile.email || 'googleuser';
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  const hashedDigits = (hash % 10000000000).toString().padStart(10, '0');
  return hashedDigits;
};

const buildFullNameFromProfile = (profile: GoogleProfile): string => {
  const directName = profile.name?.trim();
  if (directName) {
    return directName;
  }

  const given = profile.givenName?.trim();
  const family = profile.familyName?.trim();
  const combined = [given, family].filter(Boolean).join(' ').trim();
  if (combined.length > 0) {
    return combined;
  }

  const emailLocalPart = profile.email?.split('@')[0];
  if (emailLocalPart) {
    return emailLocalPart;
  }

  return 'Google User';
};

const sanitizePasswordSeed = (seed: string): string =>
  seed
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9@._-]/g, '')
    .toLowerCase();

const buildPasswordFromProfile = (profile: GoogleProfile): string => {
  const seed = sanitizePasswordSeed(profile.id || profile.email || 'mordobo');
  let password = `google-${seed}`;
  if (password.length < 12) {
    password = password.padEnd(12, '0');
  }
  if (password.length > 64) {
    password = password.slice(0, 64);
  }
  return password;
};

const buildGoogleLoginPayload = (
  profile: GoogleProfile,
  tokens: GoogleAuthTokens
): GoogleLoginPayload => {
  const idToken = tokens.idToken?.trim();
  if (!idToken) {
    throw new Error('google-missing-id-token');
  }

  return {
    idToken,
    accessToken: tokens.accessToken,
    email: profile.email,
    fullName: buildFullNameFromProfile(profile),
    givenName: profile.givenName ?? undefined,
    familyName: profile.familyName ?? undefined,
    photo: profile.photo ?? undefined,
  };
};

const loginGoogleAccount = async (
  profile: GoogleProfile,
  tokens: GoogleAuthTokens
): Promise<User> => {
  const payload = buildGoogleLoginPayload(profile, tokens);
  console.log('[GoogleAuth] Attempting backend Google login', {
    email: payload.email,
    hasIdToken: !!payload.idToken,
    hasAccessToken: !!payload.accessToken,
  });
  const response = await loginWithGoogle(payload);
  console.log('[GoogleAuth] Backend Google login succeeded', {
    userId: response.user?.id,
    userType: response.userType,
  });
  return mapAuthResponseToUser(response, profile, 'google');
};

const registerGoogleAccountInBackend = async (
  profile: GoogleProfile
) => {
  const fullName = buildFullNameFromProfile(profile);
  const password = buildPasswordFromProfile(profile);
  const email = profile.email.trim().toLowerCase();
  const phoneNumber = buildPhoneFromProfile(profile);

  console.log('[GoogleAuth] Registering Google user via API', {
    email,
    fullName,
    hasPhoneNumber: !!phoneNumber,
  });

  const response = await registerUser({
    fullName,
    email,
    phoneNumber,
    password,
    country: 'US', // Default country for Google sign-in (can be updated later in profile)
  });
  console.log('[GoogleAuth] Backend Google register succeeded', {
    userId: response.user?.id,
    userType: response.userType,
  });
  return response;
};

const resolveNameParts = (profile: GoogleProfile, fallbackFullName: string) => {
  const firstNameCandidate = profile.givenName?.trim();
  const lastNameCandidate = profile.familyName?.trim();

  if (firstNameCandidate || lastNameCandidate) {
    return {
      firstName: firstNameCandidate || fallbackFullName,
      lastName: lastNameCandidate || '',
    };
  }

  const parts = fallbackFullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return {
      firstName: profile.email,
      lastName: '',
    };
  }

  const [first, ...rest] = parts;
  return {
    firstName: first,
    lastName: rest.join(' '),
  };
};

export const registerGoogleAccount = async (
  profile: GoogleProfile,
  tokens: GoogleAuthTokens = {}
): Promise<User> => {
  const registerResponse = await registerGoogleAccountInBackend(profile);

  console.log('[GoogleAuth] Register response received', registerResponse);

  const authResponse: AuthSuccessResponse = {
    ...registerResponse,
    token: tokens.idToken,
    refreshToken: tokens.accessToken,
  };

  return mapAuthResponseToUser(authResponse, profile, 'google');
};

export const buildFallbackGoogleUser = (
  profile: GoogleProfile,
  tokens: GoogleAuthTokens = {}
): User => {
  const fullName = buildFullNameFromProfile(profile);
  const { firstName, lastName } = resolveNameParts(profile, fullName);

  return {
    id: profile.id || profile.email,
    email: profile.email,
    firstName,
    lastName,
    provider: 'google',
    avatar: profile.photo ?? undefined,
    authToken: tokens.idToken,
    refreshToken: tokens.accessToken,
  };
};

export const registerGoogleAccountOrFallback = async (
  profile: GoogleProfile,
  tokens: GoogleAuthTokens = {}
): Promise<User> => {
  console.log('[GoogleAuth] registerGoogleAccountOrFallback called', {
    email: profile.email,
    hasIdToken: !!tokens.idToken,
    hasAccessToken: !!tokens.accessToken,
  });
  try {
    return await loginGoogleAccount(profile, tokens);
  } catch (error) {
    if (error instanceof Error && error.message === 'google-missing-id-token') {
      console.warn('[GoogleAuth] Missing Google ID token. Falling back to local registration flow.');
    } else if (error instanceof ApiError) {
      console.warn('[GoogleAuth] loginWithGoogle failed', {
        status: error.status,
        message: error.message,
        data: error.data,
      });

      if (error.status === 404) {
        console.warn('[GoogleAuth] Backend Google login endpoint not found. Falling back to register response.');
        try {
          const registerResponse = await registerGoogleAccountInBackend(profile);
          const authResponse: AuthSuccessResponse = {
            ...registerResponse,
            token: tokens.idToken,
            refreshToken: tokens.accessToken,
          };
          return mapAuthResponseToUser(authResponse, profile, 'google');
        } catch (registerError) {
          if (registerError instanceof ApiError && registerError.status === 409) {
            console.warn('[GoogleAuth] Google user already registered. Using local fallback profile.');
            return buildFallbackGoogleUser(profile, tokens);
          }
          throw registerError;
        }
      }

      if (error.status === 409) {
        console.warn('[GoogleAuth] Backend reports Google user already exists. Using local fallback.');
        return buildFallbackGoogleUser(profile, tokens);
      }
    }

    console.warn('[GoogleAuth] Falling back to register-only flow', error);
  }

  try {
    return await registerGoogleAccount(profile, tokens);
  } catch (registerError) {
    console.warn('[GoogleAuth] registerGoogleAccount fallback failed', registerError);
    if (registerError instanceof ApiError && registerError.status === 409) {
      return buildFallbackGoogleUser(profile, tokens);
    }
    throw registerError;
  }
};
