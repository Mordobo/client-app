import { Platform } from 'react-native';

import { t } from '@/i18n';

const sanitizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

const getHost = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl?.length) {
    if (Platform.OS === 'android' && /localhost/i.test(envUrl)) {
      return envUrl.replace(/localhost/gi, '10.0.2.2');
    }
    return envUrl;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
};

export const API_BASE = sanitizeBaseUrl(getHost());

const buildUrl = (path: string) => {
  const base = API_BASE;
  const sanitizedPath = path.replace(/^\/+/, '');
  return `${base}/${sanitizedPath}`;
};

export interface RegisterPayload {
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  password: string;
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

const request = async <T>(path: string, init: RequestInit, defaultErrorMessage: string): Promise<T> => {
  try {
    const url = buildUrl(path);
    console.log('[API] Request', url, init.method || 'GET', init.body ? JSON.parse(init.body as string) : '');
    const response = await fetch(url, { ...init, mode: 'cors' });
    console.log('[API] Response status', response.status, response.statusText, 'for', url);

    const responseText = await response.text();
    let responseData: unknown = undefined;
    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        responseData = responseText;
      }
    }

    if (!response.ok) {
      const message =
        typeof responseData === 'object' && responseData && 'message' in responseData
          ? String((responseData as { message: unknown }).message)
          : t('errors.requestFailedStatus', { status: response.status });
      console.error('[API] Error response body', responseData);
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
  const trimmedPhone = payload.phoneNumber?.trim();
  const body: Record<string, unknown> = {
    full_name: payload.fullName,
    email: payload.email,
    password: payload.password,
  };
  if (trimmedPhone) {
    body.phone_number = trimmedPhone;
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

export interface LoginResponse extends AuthSuccessResponse {
  user: RegisterResponseUser;
  token?: string;
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
    password: payload.password,
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
