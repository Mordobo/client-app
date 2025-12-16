import { t } from '@/i18n';
import { API_BASE, request } from './auth';

const buildUrl = (path: string) => {
  const base = API_BASE;
  const sanitizedPath = path.replace(/^\/+/, '');
  return `${base}/${sanitizedPath}`;
};

// Settings Types
export interface UserSettings {
  push_notifications: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  booking_reminders: boolean;
  promotions: boolean;
  chat_messages: boolean;
  payment_receipts: boolean;
  language: 'en' | 'es';
  currency: string;
  theme: 'light' | 'dark' | 'system';
  location_services: boolean;
  biometric_enabled: boolean;
  two_factor_enabled: boolean;
}

export interface UpdateSettingsPayload {
  push_notifications?: boolean;
  email_notifications?: boolean;
  sms_notifications?: boolean;
  booking_reminders?: boolean;
  promotions?: boolean;
  chat_messages?: boolean;
  payment_receipts?: boolean;
  language?: 'en' | 'es';
  currency?: string;
  theme?: 'light' | 'dark' | 'system';
  location_services?: boolean;
  biometric_enabled?: boolean;
}

export interface ValidatePasswordPayload {
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface Enable2FAPayload {
  password: string;
}

export interface Enable2FAResponse {
  message: string;
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface Verify2FAPayload {
  token: string;
}

export interface Verify2FAResponse {
  message: string;
  backupCodes?: string[];
}

export interface Disable2FAPayload {
  password: string;
}

export interface UserSession {
  id: string;
  device_info: {
    platform?: string;
    model?: string;
    osVersion?: string;
  } | null;
  ip_address: string | null;
  user_agent: string | null;
  location: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  last_active_at: string;
  created_at: string;
  is_active: boolean;
}

export interface DeleteAccountPayload {
  password: string;
}

// GET /api/users/me/settings
export const getSettings = async (): Promise<{ settings: UserSettings }> => {
  return request<{ settings: UserSettings }>(
    '/api/users/me/settings',
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    t('errors.getSettingsFailed')
  );
};

// PUT /api/users/me/settings
export const updateSettings = async (
  payload: UpdateSettingsPayload
): Promise<{ message: string; settings: UserSettings }> => {
  return request<{ message: string; settings: UserSettings }>(
    '/api/users/me/settings',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    t('errors.updateSettingsFailed')
  );
};

// POST /api/users/me/password/validate
export const validatePassword = async (
  payload: ValidatePasswordPayload
): Promise<{ valid: boolean; message: string }> => {
  return request<{ valid: boolean; message: string }>(
    '/api/users/me/password/validate',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: payload.password }),
    },
    t('errors.changePasswordFailed')
  );
};

// PUT /api/users/me/password
export const changePassword = async (
  payload: ChangePasswordPayload
): Promise<{ message: string }> => {
  return request<{ message: string }>(
    '/api/users/me/password',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      }),
    },
    t('errors.changePasswordFailed')
  );
};

// POST /api/users/me/2fa/enable
export const enable2FA = async (
  payload: Enable2FAPayload
): Promise<Enable2FAResponse> => {
  return request<Enable2FAResponse>(
    '/api/users/me/2fa/enable',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: payload.password }),
    },
    t('errors.enable2FAFailed')
  );
};

// POST /api/users/me/2fa/verify
export const verify2FA = async (
  payload: Verify2FAPayload
): Promise<Verify2FAResponse> => {
  return request<Verify2FAResponse>(
    '/api/users/me/2fa/verify',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: payload.token }),
    },
    t('errors.verify2FAFailed')
  );
};

// DELETE /api/users/me/2fa
export const disable2FA = async (
  payload: Disable2FAPayload
): Promise<{ message: string }> => {
  return request<{ message: string }>(
    '/api/users/me/2fa',
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: payload.password }),
    },
    t('errors.disable2FAFailed')
  );
};

// GET /api/users/me/sessions
export const getSessions = async (): Promise<{ sessions: UserSession[] }> => {
  return request<{ sessions: UserSession[] }>(
    '/api/users/me/sessions',
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    t('errors.getSessionsFailed')
  );
};

// DELETE /api/users/me/sessions/:id
export const revokeSession = async (sessionId: string): Promise<{ message: string }> => {
  return request<{ message: string }>(
    `/api/users/me/sessions/${sessionId}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    t('errors.revokeSessionFailed')
  );
};

// DELETE /api/users/me
export const deleteAccount = async (
  payload: DeleteAccountPayload
): Promise<{ message: string }> => {
  return request<{ message: string }>(
    '/api/users/me',
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: payload.password }),
    },
    t('errors.deleteAccountFailed')
  );
};

// GET /api/users/me/data-export
export const requestDataExport = async (): Promise<{
  message: string;
  estimatedTime: string;
}> => {
  return request<{ message: string; estimatedTime: string }>(
    '/api/users/me/data-export',
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    t('errors.dataExportFailed')
  );
};

