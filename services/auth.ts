import { Platform } from 'react-native';

import { t } from '@/i18n';
import { API_BASE, getApiBaseUrl } from '@/utils/apiConfig';
import { authEvents } from '@/utils/authEvents';

const buildUrl = (path: string) => {
  const base = API_BASE;
  const sanitizedPath = path.replace(/^\/+/, '');
  return `${base}/${sanitizedPath}`;
};

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

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
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
  } catch (error: any) {
    // If refresh token is invalid/expired, emit session expired event
    if (error?.status === 401 || error?.status === 403) {
      console.log('[API] Refresh token invalid/expired, emitting session expired event');
      authEvents.emitSessionExpired();
    }
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
        console.log('[API] No refresh token available, session expired');
        // No refresh token means session is expired
        authEvents.emitSessionExpired();
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
      console.error('[API] Token refresh failed:', error);
      // If refresh token is invalid/expired, emit session expired event
      // This will trigger logout and redirect to login
      authEvents.emitSessionExpired();
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
  const publicEndpoints = ['/auth/login', '/auth/register', '/auth/google', '/auth/refresh', '/auth/validate-email', '/auth/forgot-password', '/auth/reset-password', '/auth/authenticate', '/auth/resend-code'];
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
    
    // Create AbortController for timeout (20 seconds - reduced for better UX)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    
    let response: Response;
    try {
      console.log('[API] Attempting fetch to:', url);
      console.log('[API] Headers:', headers);
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
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      
      console.error('[API] ❌ Fetch failed:', {
        url,
        error: errorMessage,
        isTimeout,
        errorType: fetchError instanceof Error ? fetchError.constructor.name : typeof fetchError,
        platform: Platform.OS,
      });
      
      // Log more details for network errors
      if (fetchError instanceof TypeError) {
        console.error('[API] Network error - possible causes:');
        console.error('[API] 1. Backend not running or not accessible');
        console.error('[API] 2. Firewall blocking connection');
        console.error('[API] 3. Wrong IP address (10.0.2.2 for Android emulator)');
        console.error('[API] 4. Backend not listening on 0.0.0.0');
      }
      
      // Handle timeout errors first - convert to ApiError with translated message
      if (isTimeout) {
        const timeoutMessage = t('errors.requestTimeout');
        console.error('[API] Request timeout - throwing ApiError with translated message');
        throw new ApiError(
          timeoutMessage,
          0, // Status 0 indicates network/timeout error
          { code: 'request_timeout', isTimeout: true, originalError: errorMessage }
        );
      }
      
      // Handle network errors (TypeError usually means connection failed)
      if (fetchError instanceof TypeError) {
        const connectionMessage = t('errors.connectionFailed');
        console.error('[API] Network error - throwing ApiError with translated message');
        throw new ApiError(
          connectionMessage,
          0,
          { code: 'network_error', errorType: fetchError.constructor.name, originalError: errorMessage }
        );
      }
      
      // For any other fetch errors, wrap them in ApiError
      const genericMessage = fetchError instanceof Error 
        ? (fetchError.message || t('errors.connectionFailed'))
        : t('errors.connectionFailed');
      throw new ApiError(
        genericMessage,
        0,
        { code: 'fetch_error', originalError: errorMessage }
      );
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
          const message =
            typeof retryData === 'object' && retryData && 'message' in retryData
              ? String((retryData as { message: unknown }).message)
              : t('errors.requestFailedStatus', { status: retryResponse.status });
          // Check if retry also failed with auth error
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
          
          // If retry also failed with auth error, emit session expired
          if (isRetryAuthError) {
            console.log('[API] Retry also failed with auth error, emitting session expired event');
            authEvents.emitSessionExpired();
          } else if (!isRetryAuthError) {
            console.error('[API] Retry error response body', retryData);
          }
          throw new ApiError(message, retryResponse.status, retryData);
        }

        if (!retryData || typeof retryData !== 'object') {
          throw new ApiError(t('errors.unexpectedResponse'), retryResponse.status, retryData);
        }

        return retryData as T;
      } else {
        // Refresh failed - token expired, emit session expired event
        // Don't log this as an error since it's expected when session expires
        console.log('[API] Token refresh failed, emitting session expired event');
        authEvents.emitSessionExpired();
        const message =
          typeof responseData === 'object' && responseData && 'message' in responseData
            ? String((responseData as { message: unknown }).message)
            : t('errors.tokenRefreshFailed');
        throw new ApiError(message, response.status, responseData);
      }
    }

    if (!response.ok) {
      const message =
        typeof responseData === 'object' && responseData && 'message' in responseData
          ? String((responseData as { message: unknown }).message)
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
      
      // If this is an auth error that wasn't handled above (e.g., retryOn401=false or path=/auth/refresh),
      // emit session expired event to trigger logout and redirect to Welcome
      if (isAuthError && (path === '/auth/refresh' || !retryOn401)) {
        console.log('[API] Auth error on non-retryable endpoint, emitting session expired event');
        authEvents.emitSessionExpired();
      }
      
      if (!isAuthError && !isExpectedError) {
        console.error('[API] Error response body', responseData);
      }
      
      throw new ApiError(message, response.status, responseData);
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
        const detailedMessage = `${t('errors.connectionFailed')}\n\nURL: ${API_BASE}\nPlatform: ${Platform.OS}`;
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
}

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
