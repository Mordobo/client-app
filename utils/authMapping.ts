import type { User } from '@/contexts/AuthContext';
import type { AuthSuccessResponse, RegisterResponseUser } from '@/services/auth';

export interface GoogleProfile {
  id: string;
  email: string;
  name?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  photo?: string | null;
}

const stringOrUndefined = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return undefined;
};

const extractNameParts = (fullName?: string | null) => {
  if (!fullName) {
    return { firstName: undefined, lastName: undefined };
  }
  const parts = fullName
    .split(/\s+/)
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { firstName: undefined, lastName: undefined };
  }

  const [first, ...rest] = parts;
  return {
    firstName: first || undefined,
    lastName: rest.length > 0 ? rest.join(' ') : undefined,
  };
};

const resolveName = (
  apiUser: RegisterResponseUser,
  googleUser: GoogleProfile
): { firstName: string; lastName: string } => {
  const apiFirst = stringOrUndefined((apiUser as Record<string, unknown>).first_name);
  const apiLast = stringOrUndefined((apiUser as Record<string, unknown>).last_name);
  const { firstName: splitFirst, lastName: splitLast } = extractNameParts(
    stringOrUndefined(apiUser.full_name)
  );

  const googleFirst = stringOrUndefined(googleUser?.givenName ?? undefined);
  const googleLast = stringOrUndefined(googleUser?.familyName ?? undefined);

  const googleName = stringOrUndefined(googleUser?.name);

  return {
    firstName: apiFirst ?? splitFirst ?? googleFirst ?? googleName ?? '',
    lastName: apiLast ?? splitLast ?? googleLast ?? '',
  };
};

export const mapAuthResponseToUser = (
  response: AuthSuccessResponse,
  googleUser: GoogleProfile,
  provider: User['provider']
): User => {
  const apiUser = response.user;
  const { firstName, lastName } = resolveName(apiUser, googleUser);
  
  // Extract login_count from API response if available
  const loginCount = (apiUser as Record<string, unknown>).login_count as number | undefined;

  return {
    id: stringOrUndefined(apiUser.id) ?? stringOrUndefined(googleUser?.id) ?? '',
    email: stringOrUndefined(apiUser.email) ?? stringOrUndefined(googleUser?.email) ?? '',
    firstName,
    lastName,
    phone:
      stringOrUndefined((apiUser as Record<string, unknown>).phone_number) ??
      stringOrUndefined((apiUser as Record<string, unknown>).phone),
    avatar:
      stringOrUndefined((apiUser as Record<string, unknown>).profile_image) ??
      stringOrUndefined((apiUser as Record<string, unknown>).avatar) ??
      stringOrUndefined(googleUser?.photo),
    country: stringOrUndefined((apiUser as Record<string, unknown>).country),
    provider,
    authToken: stringOrUndefined(response.token),
    refreshToken: stringOrUndefined(response.refreshToken),
    // Store login_count as a custom property (not in User interface, but accessible)
    loginCount,
  } as User & { loginCount?: number };
};
