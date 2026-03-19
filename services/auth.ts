import { Platform } from 'react-native';

import { t } from '@/i18n';
import { API_BASE, getApiBaseUrl } from '@/utils/apiConfig';
import { authEvents } from '@/utils/authEvents';

const buildUrl = (path: string) => {
  const base = API_BASE;
  const sanitizedPath = path.replace(/^\/+/, '');
  return `${base}/${sanitizedPath}`;
};

/** Hint when on physical device and API URL is local: device cannot reach PC's localhost. */
const getPhysicalDeviceHint = (): string => {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return '';
  if (!/localhost|127\.0\.0\.1|10\.0\.2\.2/i.test(API_BASE)) return '';
  return '\n\nSi usas un dispositivo físico (no emulador), en .env pon EXPO_PUBLIC_API_URL con la IP de tu PC, ej: http://192.168.1.x:3000 (misma Wi‑Fi).';
};

const SENSITIVE_HEADER_KEYS = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

/** Returns a copy of headers with sensitive values redacted for safe logging. */
function sanitizeHeadersForLog(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const keyLower = key.toLowerCase();
    if (SENSITIVE_HEADER_KEYS.some((s) => keyLower === s)) {
      out[key] = value ? '[REDACTED]' : value;
    } else {
      out[key] = value;
    }
  }
  return out;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phoneNumber?: string | null; // Old format: combined phone number (for backward compatibility)
  phoneExtension?: string; // New format: phone extension (e.g., +1, +34)
  phoneNumberOnly?: string; // New format: phone number without extension
  password: string;
  country: string;
}

export interface RegisterResponseUser {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface RegisterResponse {
  userType: string;
  user: RegisterResponseUser;
  [key: string]: unknown;
}

export interface AuthSuccessResponse extends RegisterResponse {
  token?: string;
  refreshToken?: string;
}

export class ApiError extends Error {
  status: number;
  data?: unknown;
  /** True when token expired and session expired was already emitted; UI should not show error overlay */
  sessionExpired?: boolean;

  constructor(message: string, status: number, data?: unknown, sessionExpired?: boolean) {
    super(message);
    this.status = status;
    this.data = data;
    this.sessionExpired = sessionExpired === true;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Token refresh management
let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;
let tokenUpdateCallback: ((tokens: { accessToken: string; refreshToken: string }) => Promise<void>) | null = null;
let isLoggedOut = false; // Flag to prevent API calls after logout

export const setTokenUpdateCallback = (
  callback: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>
) => {
  tokenUpdateCallback = callback;
};

// Clear all token-related state (called on logout)
export const clearTokenState = () => {
  console.log('[API] Clearing token state...');
  refreshPromise = null;
  tokenUpdateCallback = null;
  isLoggedOut = true;
  // Reset flag after a short delay to allow logout to complete
  setTimeout(() => {
    isLoggedOut = false;
  }, 1000);
};

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  user: RegisterResponseUser;
}

export const refreshTokens = async (
  refreshToken: string
): Promise<RefreshTokenResponse> => {
  const body = {
    refreshToken,
  };

  try {
    // Don't retry on 401 for refresh endpoint to avoid infinite loop
    return await request<RefreshTokenResponse>(
      '/auth/refresh',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
      t('errors.tokenRefreshFailed'),
      false // retryOn401 = false
    );
  } catch (error: unknown) {
    throw error;
  }
};

// Helper to get current tokens from storage (to avoid circular dependency)
const getCurrentTokens = async (): Promise<{ accessToken?: string; refreshToken?: string } | null> => {
  // If logout was just called, don't return tokens
  if (isLoggedOut) {
    console.log('[API] Logout in progress, returning null tokens');
    return null;
  }
  
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    const userData = await AsyncStorage.default.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      return {
        accessToken: parsedUser.authToken,
        refreshToken: parsedUser.refreshToken,
      };
    }
    return null;
  } catch (error) {
    console.error('[API] Error getting current tokens:', error);
    return null;
  }
};

// Helper to attempt token refresh
const attemptTokenRefresh = async (): Promise<{ accessToken: string; refreshToken: string } | null> => {
  // If refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  // Start new refresh
  refreshPromise = (async () => {
    try {
      const tokens = await getCurrentTokens();
      if (!tokens?.refreshToken) {
        console.log('[API] No refresh token available');
        return null;
      }

      console.log('[API] Attempting token refresh...');
      const refreshResponse = await refreshTokens(tokens.refreshToken);

      // Update tokens via callback if available
      if (tokenUpdateCallback) {
        await tokenUpdateCallback({
          accessToken: refreshResponse.accessToken,
          refreshToken: refreshResponse.refreshToken,
        });
      }

      console.log('[API] Token refresh successful');
      return {
        accessToken: refreshResponse.accessToken,
        refreshToken: refreshResponse.refreshToken,
      };
    } catch (error) {
      const status = error && typeof error === 'object' && 'status' in error ? (error as { status: number }).status : undefined;
      // Only emit session expired when refresh token is actually invalid/expired (401/403), not on network errors or timeouts
      if (status === 401 || status === 403) {
        console.log('[API] Refresh token invalid/expired, emitting session expired event');
        authEvents.emitSessionExpired();
      } else {
        console.warn('[API] Token refresh failed (network or other), keeping session:', status ?? error);
      }
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const request = async <T>(
  path: string,
  init: RequestInit,
  defaultErrorMessage: string,
  retryOn401 = true
): Promise<T> => {
  // List of public endpoints that don't require authentication
  const publicEndpoints = ['/auth/login', '/auth/register', '/auth/google', '/auth/apple', '/auth/refresh', '/auth/validate-email', '/auth/forgot-password', '/auth/reset-password', '/auth/authenticate', '/auth/resend-code', '/auth/2fa/validate'];
  const isPublicEndpoint = publicEndpoints.some(endpoint => path.startsWith(endpoint));
  
  // If logout was just called and this is not a public endpoint, throw error
  if (isLoggedOut && !isPublicEndpoint) {
    console.log('[API] Request blocked - logout in progress:', path);
    throw new ApiError('Session expired. Please log in again.', 401);
  }
  
  try {
    // Get current access token for authorization header
    const tokens = await getCurrentTokens();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // Skip ngrok browser warning page for automated requests
      'ngrok-skip-browser-warning': 'true',
      ...(init.headers as Record<string, string>),
    };

    // Only add Authorization header if we have a token
    // For public endpoints, we might not need a token
    if (tokens?.accessToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    } else if (!isPublicEndpoint && !tokens?.accessToken && !isLoggedOut) {
      // If this is not a public endpoint and we don't have a token, it's an error
      console.warn('[API] No token available for protected endpoint:', path);
      throw new ApiError('Access token required', 401, { code: 'no_token', message: 'Access token required' });
    }

    const url = buildUrl(path);
    console.log('[API] ========================================');
    console.log('[API] Request URL:', url);
    console.log('[API] Method:', init.method || 'GET');
    console.log('[API] API_BASE:', API_BASE);
    console.log('[API] Platform:', Platform.OS);
    console.log('[API] EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL || 'NOT SET');
    if (init.body) {
      try {
        const bodyData = JSON.parse(init.body as string);
        // Don't log password in production
        const sanitizedBody = { ...bodyData };
        if (sanitizedBody.password) {
          sanitizedBody.password = '***REDACTED***';
        }
        console.log('[API] Request Body:', sanitizedBody);
      } catch (e) {
        console.log('[API] Request Body: (non-JSON)');
      }
    }
    console.log('[API] ========================================');
    
    // Endpoints that send email can take 25s+ (Brevo SMTP); use longer timeout so emulator/host round-trip doesn't hit limit
    // QA on Render free tier cold-starts in 50–90s; use 90s when targeting Render
    const isRender = url.includes('onrender.com');
    const timeoutMs =
      path.includes('validate-email') || path.includes('resend-code')
        ? 70000
        : isRender
          ? 90000
          : 45000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    let response: Response;
    try {
      console.log('[API] Attempting fetch to:', url);
      console.log('[API] Headers:', sanitizeHeadersForLog(headers));
      console.log('[API] Method:', init.method || 'GET');
      
      response = await fetch(url, { 
        ...init, 
        headers, 
        mode: 'cors',
        signal: controller.signal,
        // Add keepalive for better connection handling
        keepalive: true,
      });
      clearTimeout(timeoutId);
      console.log('[API] ✅ Response received:', response.status, response.statusText, 'for', url);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const isTimeout = fetchError instanceof Error && fetchError.name === 'AbortError';
      let errorMessage: string;
      try {
        errorMessage =
          fetchError instanceof Error
            ? (fetchError.message ?? 'Unknown error')
            : String(fetchError ?? 'Unknown');
      } catch {
        errorMessage = 'Unknown error';
      }
      const errorType = fetchError instanceof Error ? fetchError.constructor.name : typeof fetchError;

      // Single log to avoid multiple in-app error overlays (was 6+ console.error per failure)
      const causes =
        fetchError instanceof TypeError
          ? ' Possible causes: (1) Backend not running or not accessible (2) Firewall (3) Wrong IP e.g. 10.0.2.2 for Android emulator (4) Backend not listening on 0.0.0.0'
          : '';
      try {
        const logPayload = { url, error: errorMessage, isTimeout, errorType, platform: Platform.OS };
        console.error('[API] Fetch failed:', JSON.stringify(logPayload) + causes);
      } catch {
        console.error('[API] Fetch failed:', errorMessage, causes);
      }

      // Handle timeout errors first - convert to ApiError with translated message
      if (isTimeout) {
        const renderHint = url.includes('onrender.com')
          ? '\n\n' + t('errors.requestTimeoutRenderHint')
          : '';
        throw new ApiError(
          t('errors.requestTimeout') + renderHint + getPhysicalDeviceHint(),
          0,
          { code: 'request_timeout', isTimeout: true, originalError: errorMessage }
        );
      }

      // Handle network errors (TypeError usually means connection failed)
      if (fetchError instanceof TypeError) {
        throw new ApiError(
          t('errors.connectionFailed') + getPhysicalDeviceHint(),
          0,
          { code: 'network_error', errorType, originalError: errorMessage }
        );
      }

      // For any other fetch errors, wrap them in ApiError
      const genericMessage =
        fetchError instanceof Error
          ? (fetchError.message || t('errors.connectionFailed'))
          : t('errors.connectionFailed');
      throw new ApiError(genericMessage, 0, { code: 'fetch_error', originalError: errorMessage });
    }

    const responseText = await response.text();
    let responseData: unknown = undefined;
    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        responseData = responseText;
      }
    }

    // Handle 401/403 Unauthorized/Forbidden - attempt token refresh
    // 403 with invalid_token should be treated the same as 401
    // Also check for "Invalid or expired token" message
    const responseMessage = typeof responseData === 'object' && responseData && 'message' in responseData
      ? String((responseData as { message: unknown }).message).toLowerCase()
      : '';
    const responseCode = typeof responseData === 'object' && responseData && 'code' in responseData
      ? String(responseData.code)
      : '';
    
    const isTokenExpiredMessage = responseMessage.includes('invalid') && 
      (responseMessage.includes('expired') || responseMessage.includes('token'));
    const isAuthError = response.status === 401 || 
      (response.status === 403 && 
       (responseCode === 'invalid_token' || isTokenExpiredMessage));
    
    if (isAuthError && retryOn401 && path !== '/auth/refresh') {
      console.log(`[API] Received ${response.status} (auth error), attempting token refresh...`);
      const newTokens = await attemptTokenRefresh();

      if (newTokens) {
        // Retry the original request with new token
        console.log('[API] Retrying request with new token...');
        const retryHeaders: Record<string, string> = {
          ...(init.headers as Record<string, string>),
          Authorization: `Bearer ${newTokens.accessToken}`,
        };
        const retryResponse = await fetch(url, { ...init, headers: retryHeaders, mode: 'cors' });
        const retryText = await retryResponse.text();
        let retryData: unknown = undefined;
        if (retryText) {
          try {
            retryData = JSON.parse(retryText);
          } catch (parseError) {
            retryData = retryText;
          }
        }

        if (!retryResponse.ok) {
          const retryMessage = typeof retryData === 'object' && retryData && 'message' in retryData
            ? String((retryData as { message: unknown }).message).toLowerCase()
            : '';
          const retryCode = typeof retryData === 'object' && retryData && 'code' in retryData
            ? String(retryData.code)
            : '';
          const isRetryTokenExpired = retryMessage.includes('invalid') && 
            (retryMessage.includes('expired') || retryMessage.includes('token'));
          const isRetryAuthError = retryResponse.status === 401 || 
            (retryResponse.status === 403 && 
             (retryCode === 'invalid_token' || isRetryTokenExpired));
          const message = isRetryAuthError
            ? t('errors.tokenRefreshFailed')
            : (typeof retryData === 'object' && retryData && 'message' in retryData
                ? String((retryData as { message: unknown }).message ?? '')
                : t('errors.requestFailedStatus', { status: retryResponse.status }));
          if (!isRetryAuthError) {
            console.error('[API] Retry error response body', retryData);
          }
          throw new ApiError(message, retryResponse.status, retryData, isRetryAuthError);
        }

        if (!retryData || typeof retryData !== 'object') {
          throw new ApiError(t('errors.unexpectedResponse'), retryResponse.status, retryData);
        }

        return retryData as T;
      } else {
        // Refresh failed (null). Session expired is only emitted inside attemptTokenRefresh
        // when the refresh token is 401/403. Do not emit here so we don't log out on network errors.
        console.log('[API] Token refresh failed (e.g. network or invalid refresh), not emitting session expired to avoid logout on transient errors');
        const refreshFailedRaw = typeof responseData === 'object' && responseData && 'message' in responseData
          ? (responseData as { message: unknown }).message
          : undefined;
        const message =
          refreshFailedRaw != null && refreshFailedRaw !== ''
            ? String(refreshFailedRaw)
            : t('errors.tokenRefreshFailed');
        const msgLower = message.toLowerCase();
        const isTokenInvalidOrExpired = (msgLower.includes('invalid') && (msgLower.includes('expired') || msgLower.includes('token'))) || msgLower.includes('token');
        throw new ApiError(message, response.status, responseData, isTokenInvalidOrExpired);
      }
    }

    if (!response.ok) {
      // #region agent log
      if (path.includes('validate-email')) fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:request',message:'response not ok',data:{path,status:response.status,code:(responseData as {code?:string})?.code},timestamp:Date.now(),hypothesisId:'H2',runId:'validate-email'})}).catch(()=>{});
      // #endregion
      const rawMessage = typeof responseData === 'object' && responseData && 'message' in responseData
        ? (responseData as { message: unknown }).message
        : undefined;
      const message =
        rawMessage != null && rawMessage !== ''
          ? String(rawMessage)
          : t('errors.requestFailedStatus', { status: response.status });
      
      // Only log non-auth errors to reduce noise (auth errors are handled above)
      // Also skip logging for expected errors like 404, 409, etc.
      const isExpectedError = response.status === 404 || response.status === 409;
      
      // Check for token expiration in message or code
      const errorMessage = typeof responseData === 'object' && responseData && 'message' in responseData
        ? String((responseData as { message: unknown }).message).toLowerCase()
        : '';
      const errorCode = typeof responseData === 'object' && responseData && 'code' in responseData
        ? String(responseData.code)
        : '';
      const isTokenExpiredMessage = errorMessage.includes('invalid') && 
        (errorMessage.includes('expired') || errorMessage.includes('token'));
      const isAuthError = response.status === 401 || 
        (response.status === 403 && 
         (errorCode === 'invalid_token' || isTokenExpiredMessage));
      
      if (!isAuthError && !isExpectedError) {
        console.error('[API] Error response body', responseData);
      }
      
      throw new ApiError(message, response.status, responseData, false);
    }

    if (response.status === 204 || response.status === 205) {
      return {} as T;
    }

    if (!responseData || typeof responseData !== 'object') {
      throw new ApiError(t('errors.unexpectedResponse'), response.status, responseData);
    }

    return responseData as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network/DNS errors
    if (error instanceof Error) {
      const errorMessage = error.message || '';
      
      console.error('[API] Network error detected:', {
        message: errorMessage,
        url: API_BASE,
        platform: Platform.OS,
        stack: error.stack,
      });
      
      // Detect DNS/connection errors
      // Note: In web, "Failed to fetch" can also occur due to CORS issues
      // We'll be more specific about connection errors
      const isConnectionError = 
        errorMessage.includes('getaddrinfo ENOTFOUND') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('Network request failed') ||
        (errorMessage.includes('Failed to fetch') && !errorMessage.includes('CORS')) ||
        errorMessage.includes('ERR_CONNECTION_REFUSED') ||
        errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
        (error instanceof TypeError && errorMessage.includes('fetch'));
      
      if (isConnectionError) {
        const detailedMessage = `${t('errors.connectionFailed')}\n\nURL: ${API_BASE}\nPlatform: ${Platform.OS}${getPhysicalDeviceHint()}`;
        throw new ApiError(
          detailedMessage,
          0,
          error
        );
      }
    }

    const message =
      error instanceof Error
        ? error.message || defaultErrorMessage
        : defaultErrorMessage;

    throw new ApiError(message, 0, error);
  }
};

export const registerUser = async (
  payload: RegisterPayload
): Promise<RegisterResponse> => {
  const body: Record<string, unknown> = {
    full_name: payload.fullName,
    email: payload.email,
    password: payload.password,
    country: payload.country,
  };

  // New format: send phoneExtension and phoneNumber separately
  if (payload.phoneExtension && payload.phoneNumberOnly) {
    body.phoneExtension = payload.phoneExtension;
    body.phoneNumber = payload.phoneNumberOnly;
  } else if (payload.phoneNumber) {
    // Old format: send combined phone_number (backward compatibility)
    const trimmedPhone = payload.phoneNumber.trim();
    if (trimmedPhone) {
      body.phone_number = trimmedPhone;
    }
  }

  return request<RegisterResponse>(
    '/auth/register',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    t('errors.registerGeneric')
  );
};

export interface GoogleLoginPayload {
  idToken: string;
  accessToken?: string;
  serverAuthCode?: string;
  email?: string;
  fullName?: string;
  givenName?: string;
  familyName?: string;
  photo?: string;
  phoneNumber?: string;
  deviceId?: string;
}

export interface LoginPayload {
  email?: string;
  phoneNumber?: string;
  password: string;
}

export interface LoginResponse {
  user: RegisterResponseUser;
  accessToken?: string;
  token?: string; // Alias for accessToken (backward compatibility)
  refreshToken?: string;
  /** When 2FA is enabled, login returns this instead of tokens until code is validated */
  requires_2fa?: boolean;
  twoFaToken?: string;
  email?: string;
}

export const loginWithCredentials = async (
  payload: LoginPayload
): Promise<LoginResponse> => {
  const body: Record<string, unknown> = {
    password: payload.password,
  };

  if (payload.email) {
    body.email = payload.email.trim().toLowerCase();
  }

  if (payload.phoneNumber) {
    body.phone_number = payload.phoneNumber.trim();
  }

  return request<LoginResponse>(
    '/auth/login',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    t('errors.loginGeneric')
  );
};

export const loginWithGoogle = async (
  payload: GoogleLoginPayload
): Promise<AuthSuccessResponse> => {
  return request<AuthSuccessResponse>(
    '/auth/google',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    t('errors.googleLoginGeneric')
  );
};

export interface AppleLoginPayload {
  identityToken: string;
  authorizationCode?: string;
  email?: string;
  fullName?: string;
}

export const loginWithApple = async (
  payload: AppleLoginPayload
): Promise<AuthSuccessResponse> => {
  return request<AuthSuccessResponse>(
    '/auth/apple',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    t('errors.appleLoginGeneric')
  );
};

export interface ValidateEmailPayload {
  email: string;
  password: string;
}

export interface ValidateEmailResponse {
  message: string;
  email: string;
  code?: string; // Only in development when SMTP is not configured
  warning?: string;
}

export const validateEmail = async (
  payload: ValidateEmailPayload
): Promise<ValidateEmailResponse> => {
  const body = {
    email: payload.email.trim().toLowerCase(),
    password: payload.password.trim(), // Ensure password is trimmed
  };
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:validateEmail',message:'validateEmail called',data:{email:body.email,path:'/auth/validate-email'},timestamp:Date.now(),hypothesisId:'H1',runId:'validate-email'})}).catch(()=>{});
  // #endregion

  return request<ValidateEmailResponse>(
    '/auth/validate-email',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    t('errors.verificationFailed')
  );
};

export interface VerifyCodePayload {
  email: string;
  code: string;
}

export interface VerifyCodeResponse extends AuthSuccessResponse {
  user: RegisterResponseUser;
  accessToken?: string;
  refreshToken?: string;
  requires_2fa?: boolean;
  twoFaToken?: string;
  email?: string;
}

/** Mark client onboarding as completed so it is not shown again. Requires authenticated client. */
export const completeClientOnboarding = async (): Promise<void> => {
  await request<{ message: string }>(
    '/api/users/me/complete-client-onboarding',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    t('errors.requestFailed')
  );
};

export const verifyCode = async (
  payload: VerifyCodePayload
): Promise<VerifyCodeResponse> => {
  const body = {
    email: payload.email.trim().toLowerCase(),
    code: payload.code,
  };

  return request<VerifyCodeResponse>(
    '/auth/authenticate',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    t('errors.verificationFailed')
  );
};

export interface Validate2FAPayload {
  twoFaToken: string;
  code: string;
}

/** Complete login when 2FA is enabled. Call after login or verify returned requires_2fa. */
export const validate2FACode = async (
  payload: Validate2FAPayload
): Promise<LoginResponse> => {
  return request<LoginResponse>(
    '/auth/2fa/validate',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        twoFaToken: payload.twoFaToken,
        code: payload.code.trim(),
      }),
    },
    t('errors.verify2FAFailed')
  );
};

export interface ResendCodePayload {
  email: string;
  password: string;
}

export interface ResendCodeResponse {
  message: string;
  email: string;
  verificationCode?: string; // Only included when SMTP fails (for testing)
}

export const resendCode = async (
  payload: ResendCodePayload
): Promise<ResendCodeResponse> => {
  const body = {
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
  };

  return request<ResendCodeResponse>(
    '/auth/resend-code',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    t('errors.verificationFailed')
  );
};

export interface ForgotPasswordPayload {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export const forgotPassword = async (
  payload: ForgotPasswordPayload
): Promise<ForgotPasswordResponse> => {
  const body = {
    email: payload.email.trim().toLowerCase(),
  };

  return request<ForgotPasswordResponse>(
    '/auth/forgot-password',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    t('errors.forgotPasswordFailed')
  );
};

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export const resetPassword = async (
  payload: ResetPasswordPayload
): Promise<ResetPasswordResponse> => {
  const body = {
    token: payload.token,
    newPassword: payload.newPassword.trim(),
  };

  return request<ResetPasswordResponse>(
    '/auth/reset-password',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    t('errors.resetPasswordFailed')
  );
};
