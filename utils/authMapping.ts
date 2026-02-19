import type { User } from '@/contexts/AuthContext';
import type { ClientTier } from '@/constants/tiers';
import type { AuthSuccessResponse, RegisterResponseUser } from '@/services/auth';

const VALID_TIERS: ReadonlySet<string> = new Set(['bronze', 'silver', 'gold', 'platinum']);

const extractTier = (raw: unknown): ClientTier | undefined => {
  if (typeof raw === 'string' && VALID_TIERS.has(raw)) return raw as ClientTier;
  return undefined;
};

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

/**
 * Map RegisterResponseUser to User (without Google profile)
 * Used for email/phone login flows
 */
export const mapApiUserToUser = (
  apiUser: RegisterResponseUser,
  provider: User['provider'],
  authToken?: string,
  refreshToken?: string
): User => {
  const { firstName: splitFirst, lastName: splitLast } = extractNameParts(
    stringOrUndefined(apiUser.full_name)
  );
  const apiFirst = stringOrUndefined((apiUser as Record<string, unknown>).first_name);
  const apiLast = stringOrUndefined((apiUser as Record<string, unknown>).last_name);
  
  const firstName = apiFirst ?? splitFirst ?? '';
  const lastName = apiLast ?? splitLast ?? '';
  
  // Extract gender and dateOfBirth from API response
  const apiGender = (apiUser as Record<string, unknown>).gender;
  const gender = apiGender === 'male' || apiGender === 'female' ? apiGender : undefined;
  const dateOfBirth = stringOrUndefined((apiUser as Record<string, unknown>).date_of_birth);
  
  // Extract login_count from API response if available
  const loginCount = (apiUser as Record<string, unknown>).login_count as number | undefined;

  const raw = apiUser as Record<string, unknown>;
  const tier = extractTier(raw.client_tier);
  const completedOrdersCount = typeof raw.completed_orders_count === 'number' ? raw.completed_orders_count : undefined;

  return {
    id: stringOrUndefined(apiUser.id) ?? '',
    email: stringOrUndefined(apiUser.email) ?? '',
    firstName,
    lastName,
    phone:
      stringOrUndefined(raw.phone_number) ??
      stringOrUndefined(raw.phone),
    avatar:
      stringOrUndefined(raw.profile_image) ??
      stringOrUndefined(raw.avatar),
    country: stringOrUndefined(raw.country),
    gender,
    dateOfBirth,
    provider,
    authToken: authToken ? stringOrUndefined(authToken) : undefined,
    refreshToken: refreshToken ? stringOrUndefined(refreshToken) : undefined,
    tier,
    completedOrdersCount,
    loginCount,
  } as User & { loginCount?: number };
};

export const mapAuthResponseToUser = (
  response: AuthSuccessResponse,
  googleUser: GoogleProfile,
  provider: User['provider']
): User => {
  const apiUser = response.user;
  const { firstName, lastName } = resolveName(apiUser, googleUser);
  
  const raw = apiUser as Record<string, unknown>;
  const loginCount = raw.login_count as number | undefined;

  const apiGender = raw.gender;
  const gender = apiGender === 'male' || apiGender === 'female' ? apiGender : undefined;
  const dateOfBirth = stringOrUndefined(raw.date_of_birth);

  const tier = extractTier(raw.client_tier);
  const completedOrdersCount = typeof raw.completed_orders_count === 'number' ? raw.completed_orders_count : undefined;

  return {
    id: stringOrUndefined(apiUser.id) ?? stringOrUndefined(googleUser?.id) ?? '',
    email: stringOrUndefined(apiUser.email) ?? stringOrUndefined(googleUser?.email) ?? '',
    firstName,
    lastName,
    phone:
      stringOrUndefined(raw.phone_number) ??
      stringOrUndefined(raw.phone),
    avatar:
      stringOrUndefined(raw.profile_image) ??
      stringOrUndefined(raw.avatar) ??
      stringOrUndefined(googleUser?.photo),
    country: stringOrUndefined(raw.country),
    gender,
    dateOfBirth,
    provider,
    authToken: stringOrUndefined(response.token),
    refreshToken: stringOrUndefined(response.refreshToken),
    tier,
    completedOrdersCount,
    loginCount,
  } as User & { loginCount?: number };
};
