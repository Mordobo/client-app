const DEFAULT_API_BASE_URL = 'http://localhost:3000';

const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim();
  }
  return DEFAULT_API_BASE_URL;
};

const buildUrl = (path: string) => {
  const base = getBaseUrl().replace(/\/+$/, '');
  const sanitizedPath = path.replace(/^\/+/, '');
  return `${base}/${sanitizedPath}`;
};

export interface RegisterPayload {
  fullName: string;
  email: string;
  phoneNumber: string;
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

export const registerUser = async (
  payload: RegisterPayload
): Promise<RegisterResponse> => {
  const body = {
    full_name: payload.fullName,
    email: payload.email,
    phone_number: payload.phoneNumber,
    password: payload.password,
  };

  try {
    const response = await fetch(buildUrl('/auth/register'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

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
          : `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, responseData);
    }

    if (!responseData || typeof responseData !== 'object') {
      throw new ApiError('Unexpected response from server.', response.status, responseData);
    }

    return responseData as RegisterResponse;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const message =
      error instanceof Error
        ? error.message || 'Unable to register user. Please try again.'
        : 'Unable to register user. Please try again.';

    throw new ApiError(message, 0, error);
  }
};
